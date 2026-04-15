import { NextResponse } from "next/server";

import { normalizeCsvHeader, parseCsvLine, splitCsvLines } from "@/lib/csv";
import { isForecastDestinationInputValid } from "@/lib/forecast-destination-countries";
import { createForecast, findActiveProductByNameAndSku } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { Region } from "@/lib/types";
const MONTH_RE = /^\d{4}-\d{2}$/;
const MAX_ROWS = 500;

type BatchKey =
  | "month"
  | "region"
  | "destination"
  | "product_name"
  | "sku"
  | "build_to_order"
  | "build_to_stock"
  | "remark";

function isRegion(value: string): value is Region {
  return value === "APAC" || value === "EU" || value === "USA";
}

function resolveHeaderKey(normalized: string): BatchKey | null {
  const map: Record<string, BatchKey> = {
    month: "month",
    region: "region",
    destination: "destination",
    product_name: "product_name",
    productname: "product_name",
    sku: "sku",
    build_to_order: "build_to_order",
    bto: "build_to_order",
    build_to_stock: "build_to_stock",
    bts: "build_to_stock",
    remark: "remark",
  };
  return map[normalized] ?? null;
}

function buildColumnIndex(headerCells: string[]): Map<BatchKey, number> | { error: string } {
  const idx = new Map<BatchKey, number>();
  for (let c = 0; c < headerCells.length; c++) {
    const key = resolveHeaderKey(normalizeCsvHeader(headerCells[c]));
    if (!key) continue;
    if (idx.has(key)) return { error: `Duplicate column: ${key}` };
    idx.set(key, c);
  }
  const required: BatchKey[] = [
    "month",
    "region",
    "destination",
    "product_name",
    "sku",
    "build_to_order",
    "build_to_stock",
  ];
  for (const k of required) {
    if (!idx.has(k)) return { error: `Missing required column (header row): ${k}` };
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

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Missing file field \"file\"" }, { status: 400 });
  }

  const text = await file.text();
  const rawLines = splitCsvLines(text).filter((l) => !l.trim().startsWith("#"));
  if (rawLines.length < 2) {
    return NextResponse.json(
      { message: "CSV must include a header row and at least one data row" },
      { status: 400 },
    );
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
    if (row.every((x) => x.trim() === "")) continue;

    const month = cell(row, col, "month").trim();
    const region = cell(row, col, "region").trim();
    const destination = cell(row, col, "destination").trim();
    const productName = cell(row, col, "product_name").trim();
    const sku = cell(row, col, "sku").trim();
    const buildToOrder = Number(cell(row, col, "build_to_order"));
    const buildToStock = Number(cell(row, col, "build_to_stock"));
    const remark = cell(row, col, "remark").trim();

    if (!MONTH_RE.test(month)) {
      errors.push({ row: rowNum, message: "Invalid month (YYYY-MM)" });
      continue;
    }
    if (!isRegion(region)) {
      errors.push({ row: rowNum, message: "Invalid region" });
      continue;
    }
    if (!session.regions.includes(region)) {
      errors.push({ row: rowNum, message: "Forbidden region for your account" });
      continue;
    }
    if (!isForecastDestinationInputValid(destination)) {
      errors.push({ row: rowNum, message: "Invalid destination country" });
      continue;
    }
    if (!productName || !sku) {
      errors.push({ row: rowNum, message: "Missing product_name or sku" });
      continue;
    }
    if (
      !Number.isFinite(buildToOrder) ||
      !Number.isInteger(buildToOrder) ||
      buildToOrder < 0 ||
      !Number.isFinite(buildToStock) ||
      !Number.isInteger(buildToStock) ||
      buildToStock < 0
    ) {
      errors.push({ row: rowNum, message: "Invalid build_to_order/build_to_stock" });
      continue;
    }
    const product = await findActiveProductByNameAndSku(productName, sku);
    if (!product) {
      errors.push({ row: rowNum, message: "Invalid product_name and sku" });
      continue;
    }
    try {
      await createForecast({
        month,
        region,
        destination,
        productName,
        sku,
        remark,
        buildToOrder,
        buildToStock,
        createdBy: session.username,
      });
      created += 1;
    } catch (e) {
      errors.push({ row: rowNum, message: e instanceof Error ? e.message : "Create failed" });
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    failed: errors.length,
    errors,
  });
}
