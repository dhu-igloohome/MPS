import { NextResponse } from "next/server";

import { normalizeCsvHeader, parseCsvLine, splitCsvLines } from "@/lib/csv";
import {
  createOrderProgress,
  findActiveProductByNameAndSku,
  orderProgressRegionsForSession,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type {
  OrderProgressOrderType,
  OrderProgressRegion,
  OrderProgressStatus,
} from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ORDER_NUMBER_MAX = 200;
const MAX_ROWS = 500;

function isOrderProgressRegion(value: string): value is OrderProgressRegion {
  return value === "APAC" || value === "EU" || value === "US";
}

function isOrderType(value: string): value is OrderProgressOrderType {
  return value === "BTO" || value === "BTS";
}

function isProgress(value: string): value is OrderProgressStatus {
  return value === "not_started" || value === "in_production" || value === "ready_to_ship";
}

type BatchKey =
  | "order_number"
  | "product_name"
  | "sku"
  | "quantity"
  | "order_date"
  | "expected_delivery_date"
  | "order_type"
  | "progress"
  | "factory_name"
  | "region";

function resolveHeaderKey(normalized: string): BatchKey | null {
  const map: Record<string, BatchKey> = {
    order_number: "order_number",
    order_no: "order_number",
    ordernumber: "order_number",
    product_name: "product_name",
    productname: "product_name",
    sku: "sku",
    quantity: "quantity",
    qty: "quantity",
    order_date: "order_date",
    orderdate: "order_date",
    expected_delivery_date: "expected_delivery_date",
    expecteddeliverydate: "expected_delivery_date",
    expected_date: "expected_delivery_date",
    delivery_date: "expected_delivery_date",
    order_type: "order_type",
    ordertype: "order_type",
    type: "order_type",
    progress: "progress",
    factory_name: "factory_name",
    factoryname: "factory_name",
    factory: "factory_name",
    region: "region",
  };
  return map[normalized] ?? null;
}

function buildColumnIndex(headerCells: string[]): Map<BatchKey, number> | { error: string } {
  const idx = new Map<BatchKey, number>();
  for (let c = 0; c < headerCells.length; c++) {
    const key = resolveHeaderKey(normalizeCsvHeader(headerCells[c]));
    if (!key) continue;
    if (idx.has(key)) {
      return { error: `Duplicate column: ${key}` };
    }
    idx.set(key, c);
  }
  const required: BatchKey[] = [
    "product_name",
    "sku",
    "quantity",
    "order_date",
    "expected_delivery_date",
    "order_type",
    "progress",
    "region",
  ];
  for (const k of required) {
    if (!idx.has(k)) {
      return { error: `Missing required column (header row): ${k}` };
    }
  }
  return idx;
}

function cell(row: string[], col: Map<BatchKey, number>, key: BatchKey): string {
  const i = col.get(key);
  if (i === undefined) return "";
  return row[i] ?? "";
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const allowedRegions = orderProgressRegionsForSession(session.regions);
  if (allowedRegions.length === 0) {
    return NextResponse.json({ message: "No regions assigned" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Missing file field \"file\"" }, { status: 400 });
  }

  const text = await file.text();
  const rawLines = splitCsvLines(text).filter((l) => !l.trim().startsWith("#"));
  if (rawLines.length < 2) {
    return NextResponse.json({ message: "CSV must include a header row and at least one data row" }, { status: 400 });
  }

  const headerParsed = parseCsvLine(rawLines[0]);
  const colResult = buildColumnIndex(headerParsed);
  if ("error" in colResult) {
    return NextResponse.json({ message: colResult.error }, { status: 400 });
  }
  const col = colResult;

  const dataLines = rawLines.slice(1);
  if (dataLines.length > MAX_ROWS) {
    return NextResponse.json({ message: `At most ${MAX_ROWS} data rows allowed` }, { status: 400 });
  }

  const errors: { row: number; message: string }[] = [];
  let created = 0;

  for (let r = 0; r < dataLines.length; r++) {
    const rowNum = r + 2;
    const row = parseCsvLine(dataLines[r]);
    if (row.every((x) => x.trim() === "")) {
      continue;
    }

    const orderNumber = cell(row, col, "order_number").trim().slice(0, ORDER_NUMBER_MAX);
    const productName = cell(row, col, "product_name").trim();
    const sku = cell(row, col, "sku").trim();
    const quantity = Number(cell(row, col, "quantity"));
    const orderDate = cell(row, col, "order_date").trim();
    const expectedDeliveryDate = cell(row, col, "expected_delivery_date").trim();
    const orderType = cell(row, col, "order_type").trim();
    const progress = cell(row, col, "progress").trim();
    const factoryName = cell(row, col, "factory_name").trim();
    const region = cell(row, col, "region").trim();

    if (!productName || !sku) {
      errors.push({ row: rowNum, message: "Missing product_name or sku" });
      continue;
    }
    if (!DATE_RE.test(orderDate)) {
      errors.push({ row: rowNum, message: "Invalid order_date" });
      continue;
    }
    if (!DATE_RE.test(expectedDeliveryDate)) {
      errors.push({ row: rowNum, message: "Invalid expected_delivery_date" });
      continue;
    }
    if (!isOrderType(orderType)) {
      errors.push({ row: rowNum, message: "Invalid order_type" });
      continue;
    }
    if (!isProgress(progress)) {
      errors.push({ row: rowNum, message: "Invalid progress" });
      continue;
    }
    if (!isOrderProgressRegion(region)) {
      errors.push({ row: rowNum, message: "Invalid region" });
      continue;
    }
    if (!allowedRegions.includes(region)) {
      errors.push({ row: rowNum, message: "Forbidden region for your account" });
      continue;
    }
    if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0) {
      errors.push({ row: rowNum, message: "Invalid quantity" });
      continue;
    }

    const product = await findActiveProductByNameAndSku(productName, sku);
    if (!product) {
      errors.push({ row: rowNum, message: "Invalid product_name and sku" });
      continue;
    }

    try {
      await createOrderProgress({
        orderNumber,
        poNumber: "",
        productName,
        sku,
        quantity,
        orderDate,
        expectedDeliveryDate,
        orderType,
        progress,
        factoryName,
        region,
        createdBy: session.username,
        deliveryPlans: [],
      });
      created += 1;
    } catch (e) {
      errors.push({
        row: rowNum,
        message: e instanceof Error ? e.message : "Create failed",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    failed: errors.length,
    errors,
  });
}
