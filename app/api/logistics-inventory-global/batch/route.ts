import { NextResponse } from "next/server";

import { normalizeCsvHeader, parseCsvLine, splitCsvLines } from "@/lib/csv";
import { isInventoryGlobalMainSku } from "@/lib/inventory-global-main-skus";
import { createInventoryGlobalEntry } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { InventoryGlobalEntry } from "@/lib/types";

const MAX_ROWS = 500;

const HEADER = [
  "mainSku",
  "variantSku",
  "batch",
  "batchNoSn",
  "goodToReleaseShipmentFromCm",
  "status",
  "description",
  "stockQtyAvailableForFulfillment",
  "reservedQty",
  "batchesBalanceQty",
  "mpBatchProducedQty",
  "dkksFactory",
  "huiliFactory",
  "bolanFactory",
  "jiadunFactory",
  "jinjianFactory",
  "huameiFactory",
  "shenzhenOffice",
  "taiwanFuhshing",
  "singaporeOffice",
  "cargohubWarehouse",
  "koreaSolityFactory",
  "vietnamSolityFactory",
  "aztechFactory",
  "swrFactory",
  "vsFactory",
  "ibeFactory",
  "smartWarehousing",
  "omniWarehouse",
  "amazonFba",
  "safetyStockAtAmazon",
  "jdmWarehouse",
  "amazon",
  "syw",
  "inTransitStock",
  "inventoryReceivedDate",
  "agingDaysC",
  "unitPriceRmb",
  "unitPriceUsd",
  "batchesInventoryCostUsd",
  "skuInventoryCostUsd",
  "chinaInventoryCostUsd",
  "singaporeInventoryCostUsd",
  "singaporeCargohubInventoryCostUsd",
  "koreaSolityInventoryCost",
  "vietnamSolityInventoryCostUsd",
  "usaOmniInventoryVostUsd",
  "usAmazonFba",
  "europeJdmInventoryCostUsd",
  "inTransitInventoryCostUsd",
] as const;

type BatchKey = (typeof HEADER)[number];
type BatchPayload = Omit<InventoryGlobalEntry, "id" | "createdAt" | "updatedAt">;

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
  if (!idx.has("mainSku")) return { error: "Missing required column (header row): mainSku" };
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

function parseRow(row: string[], col: Map<BatchKey, number>, createdBy: string): BatchPayload {
  return {
    mainSku: cell(row, col, "mainSku").trim(),
    variantSku: cell(row, col, "variantSku").trim(),
    batch: cell(row, col, "batch").trim(),
    batchNoSn: cell(row, col, "batchNoSn").trim(),
    goodToReleaseShipmentFromCm: parseInt0(cell(row, col, "goodToReleaseShipmentFromCm")),
    status: cell(row, col, "status").trim(),
    description: cell(row, col, "description").trim(),
    stockQtyAvailableForFulfillment: parseInt0(cell(row, col, "stockQtyAvailableForFulfillment")),
    reservedQty: parseInt0(cell(row, col, "reservedQty")),
    batchesBalanceQty: parseInt0(cell(row, col, "batchesBalanceQty")),
    mpBatchProducedQty: parseInt0(cell(row, col, "mpBatchProducedQty")),
    dkksFactory: parseInt0(cell(row, col, "dkksFactory")),
    huiliFactory: parseInt0(cell(row, col, "huiliFactory")),
    bolanFactory: parseInt0(cell(row, col, "bolanFactory")),
    jiadunFactory: parseInt0(cell(row, col, "jiadunFactory")),
    jinjianFactory: parseInt0(cell(row, col, "jinjianFactory")),
    huameiFactory: parseInt0(cell(row, col, "huameiFactory")),
    shenzhenOffice: parseInt0(cell(row, col, "shenzhenOffice")),
    taiwanFuhshing: parseInt0(cell(row, col, "taiwanFuhshing")),
    singaporeOffice: parseInt0(cell(row, col, "singaporeOffice")),
    cargohubWarehouse: parseInt0(cell(row, col, "cargohubWarehouse")),
    koreaSolityFactory: parseInt0(cell(row, col, "koreaSolityFactory")),
    vietnamSolityFactory: parseInt0(cell(row, col, "vietnamSolityFactory")),
    aztechFactory: parseInt0(cell(row, col, "aztechFactory")),
    swrFactory: parseInt0(cell(row, col, "swrFactory")),
    vsFactory: parseInt0(cell(row, col, "vsFactory")),
    ibeFactory: parseInt0(cell(row, col, "ibeFactory")),
    smartWarehousing: parseInt0(cell(row, col, "smartWarehousing")),
    omniWarehouse: parseInt0(cell(row, col, "omniWarehouse")),
    amazonFba: parseInt0(cell(row, col, "amazonFba")),
    safetyStockAtAmazon: parseInt0(cell(row, col, "safetyStockAtAmazon")),
    jdmWarehouse: parseInt0(cell(row, col, "jdmWarehouse")),
    amazon: parseInt0(cell(row, col, "amazon")),
    syw: parseInt0(cell(row, col, "syw")),
    inTransitStock: parseInt0(cell(row, col, "inTransitStock")),
    inventoryReceivedDate: cell(row, col, "inventoryReceivedDate").trim() || null,
    agingDaysC: parseInt0(cell(row, col, "agingDaysC")),
    unitPriceRmb: parseMoney(cell(row, col, "unitPriceRmb")),
    unitPriceUsd: parseMoney(cell(row, col, "unitPriceUsd")),
    batchesInventoryCostUsd: parseMoney(cell(row, col, "batchesInventoryCostUsd")),
    skuInventoryCostUsd: parseMoney(cell(row, col, "skuInventoryCostUsd")),
    chinaInventoryCostUsd: parseMoney(cell(row, col, "chinaInventoryCostUsd")),
    singaporeInventoryCostUsd: parseMoney(cell(row, col, "singaporeInventoryCostUsd")),
    singaporeCargohubInventoryCostUsd: parseMoney(cell(row, col, "singaporeCargohubInventoryCostUsd")),
    koreaSolityInventoryCost: parseMoney(cell(row, col, "koreaSolityInventoryCost")),
    vietnamSolityInventoryCostUsd: parseMoney(cell(row, col, "vietnamSolityInventoryCostUsd")),
    usaOmniInventoryVostUsd: parseMoney(cell(row, col, "usaOmniInventoryVostUsd")),
    usAmazonFba: parseMoney(cell(row, col, "usAmazonFba")),
    europeJdmInventoryCostUsd: parseMoney(cell(row, col, "europeJdmInventoryCostUsd")),
    inTransitInventoryCostUsd: parseMoney(cell(row, col, "inTransitInventoryCostUsd")),
    createdBy,
  };
}

function validateNumeric(entry: BatchPayload): string | null {
  const intFields: (keyof BatchPayload)[] = [
    "goodToReleaseShipmentFromCm",
    "stockQtyAvailableForFulfillment",
    "reservedQty",
    "batchesBalanceQty",
    "mpBatchProducedQty",
    "dkksFactory",
    "huiliFactory",
    "bolanFactory",
    "jiadunFactory",
    "jinjianFactory",
    "huameiFactory",
    "shenzhenOffice",
    "taiwanFuhshing",
    "singaporeOffice",
    "cargohubWarehouse",
    "koreaSolityFactory",
    "vietnamSolityFactory",
    "aztechFactory",
    "swrFactory",
    "vsFactory",
    "ibeFactory",
    "smartWarehousing",
    "omniWarehouse",
    "amazonFba",
    "safetyStockAtAmazon",
    "jdmWarehouse",
    "amazon",
    "syw",
    "inTransitStock",
    "agingDaysC",
  ];
  for (const k of intFields) {
    const v = entry[k];
    if (typeof v === "number" && Number.isNaN(v)) return `Invalid ${String(k)}`;
  }
  const moneyFields: (keyof BatchPayload)[] = [
    "unitPriceRmb",
    "unitPriceUsd",
    "batchesInventoryCostUsd",
    "skuInventoryCostUsd",
    "chinaInventoryCostUsd",
    "singaporeInventoryCostUsd",
    "singaporeCargohubInventoryCostUsd",
    "koreaSolityInventoryCost",
    "vietnamSolityInventoryCostUsd",
    "usaOmniInventoryVostUsd",
    "usAmazonFba",
    "europeJdmInventoryCostUsd",
    "inTransitInventoryCostUsd",
  ];
  for (const k of moneyFields) {
    const v = entry[k];
    if (typeof v === "number" && Number.isNaN(v)) return `Invalid ${String(k)}`;
  }
  return null;
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

    const payload = parseRow(row, colResult, session.username);
    if (!payload.mainSku || !isInventoryGlobalMainSku(payload.mainSku)) {
      errors.push({ row: rowNum, message: "Invalid or missing Main SKU" });
      continue;
    }
    const err = validateNumeric(payload);
    if (err) {
      errors.push({ row: rowNum, message: err });
      continue;
    }

    try {
      await createInventoryGlobalEntry(payload);
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
