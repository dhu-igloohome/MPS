import { NextResponse } from "next/server";

import { normalizeCsvHeader, parseCsvLine, splitCsvLines } from "@/lib/csv";
import { createShippingReport } from "@/lib/repositories";
import { isShippingReportSku } from "@/lib/shipping-report-skus";
import { getSession } from "@/lib/session";

const MAX_ROWS = 500;

const HEADER = [
  "sn",
  "dateReleased",
  "consigneeCompanyName",
  "doGrnNumber",
  "soCoReferenceNumber",
  "podLink",
  "sku",
  "accessoryQuantity",
  "accessoryNumber",
  "requestBy",
  "poNumber",
  "btoBts",
  "purpose",
  "shipFrom",
  "shipTo",
  "shipToRegion",
  "shippingMode",
  "shippingMethod",
  "trackingNumber",
  "costCentre",
  "paidByIgloo",
  "paidByCustomer",
  "sgdPaidByIgloo",
  "sgdPaidByCustomer",
  "usd",
  "productSerialNo",
  "remarks",
] as const;

type BatchKey = (typeof HEADER)[number];

const FIELD_BY_NORMALIZED = Object.fromEntries(
  HEADER.map((key) => [key.toLowerCase(), key]),
) as Record<string, BatchKey>;

function resolveHeaderKey(normalized: string): BatchKey | null {
  const compact = normalized.replaceAll("_", "");
  return FIELD_BY_NORMALIZED[compact] ?? null;
}

function buildColumnIndex(headerCells: string[]): Map<BatchKey, number> | { error: string } {
  const idx = new Map<BatchKey, number>();
  for (let c = 0; c < headerCells.length; c++) {
    const key = resolveHeaderKey(normalizeCsvHeader(headerCells[c]));
    if (!key) continue;
    if (idx.has(key)) return { error: `Duplicate column: ${key}` };
    idx.set(key, c);
  }
  for (const required of ["sn", "sku"] satisfies BatchKey[]) {
    if (!idx.has(required)) return { error: `Missing required column (header row): ${required}` };
  }
  return idx;
}

function cell(row: string[], col: Map<BatchKey, number>, key: BatchKey): string {
  const i = col.get(key);
  if (i === undefined) return "";
  return row[i] ?? "";
}

function parseInt0(value: string): number {
  const text = value.trim();
  if (!text) return 0;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : NaN;
}

function parseMoney(value: string): number {
  const text = value.trim();
  if (!text) return 0;
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Missing file field "file"' }, { status: 400 });
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
  if ("error" in colResult) return NextResponse.json({ message: colResult.error }, { status: 400 });

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

    const sn = cell(row, colResult, "sn").trim();
    const sku = cell(row, colResult, "sku").trim();
    const accessoryQuantity = parseInt0(cell(row, colResult, "accessoryQuantity"));
    const paidByIgloo = parseMoney(cell(row, colResult, "paidByIgloo"));
    const paidByCustomer = parseMoney(cell(row, colResult, "paidByCustomer"));
    const sgdPaidByIgloo = parseMoney(cell(row, colResult, "sgdPaidByIgloo"));
    const sgdPaidByCustomer = parseMoney(cell(row, colResult, "sgdPaidByCustomer"));
    const usd = parseMoney(cell(row, colResult, "usd"));

    if (!sn) {
      errors.push({ row: rowNum, message: "SN is required" });
      continue;
    }
    if (!isShippingReportSku(sku)) {
      errors.push({ row: rowNum, message: "Invalid SKU" });
      continue;
    }
    if ([accessoryQuantity, paidByIgloo, paidByCustomer, sgdPaidByIgloo, sgdPaidByCustomer, usd].some(Number.isNaN)) {
      errors.push({ row: rowNum, message: "Invalid numeric fields" });
      continue;
    }

    try {
      await createShippingReport({
        sn,
        dateReleased: cell(row, colResult, "dateReleased").trim() || null,
        consigneeCompanyName: cell(row, colResult, "consigneeCompanyName").trim(),
        doGrnNumber: cell(row, colResult, "doGrnNumber").trim(),
        soCoReferenceNumber: cell(row, colResult, "soCoReferenceNumber").trim(),
        podLink: cell(row, colResult, "podLink").trim(),
        sku,
        accessoryQuantity,
        accessoryNumber: cell(row, colResult, "accessoryNumber").trim(),
        requestBy: cell(row, colResult, "requestBy").trim(),
        poNumber: cell(row, colResult, "poNumber").trim(),
        btoBts: cell(row, colResult, "btoBts").trim(),
        purpose: cell(row, colResult, "purpose").trim(),
        shipFrom: cell(row, colResult, "shipFrom").trim(),
        shipTo: cell(row, colResult, "shipTo").trim(),
        shipToRegion: cell(row, colResult, "shipToRegion").trim(),
        shippingMode: cell(row, colResult, "shippingMode").trim(),
        shippingMethod: cell(row, colResult, "shippingMethod").trim(),
        trackingNumber: cell(row, colResult, "trackingNumber").trim(),
        costCentre: cell(row, colResult, "costCentre").trim(),
        paidByIgloo,
        paidByCustomer,
        sgdPaidByIgloo,
        sgdPaidByCustomer,
        usd,
        productSerialNo: cell(row, colResult, "productSerialNo").trim(),
        remarks: cell(row, colResult, "remarks").trim(),
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
