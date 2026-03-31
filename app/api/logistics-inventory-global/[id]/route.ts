import { NextResponse } from "next/server";

import {
  deleteInventoryGlobalEntryById,
  getInventoryGlobalEntryById,
  updateInventoryGlobalEntry,
} from "@/lib/repositories";
import { isInventoryGlobalMainSku } from "@/lib/inventory-global-main-skus";
import { getSession } from "@/lib/session";
import type { InventoryGlobalEntry } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

function parseInt0(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : NaN;
}

function parseMoney(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

function bodyToUpdate(
  body: Record<string, unknown>,
  id: string,
): Omit<InventoryGlobalEntry, "createdAt" | "updatedAt"> {
  return {
    id,
    mainSku: String(body.mainSku ?? "").trim(),
    variantSku: String(body.variantSku ?? "").trim(),
    batch: String(body.batch ?? "").trim(),
    batchNoSn: String(body.batchNoSn ?? "").trim(),
    goodToReleaseShipmentFromCm: parseInt0(body.goodToReleaseShipmentFromCm),
    status: String(body.status ?? "").trim(),
    description: String(body.description ?? "").trim(),
    stockQtyAvailableForFulfillment: parseInt0(body.stockQtyAvailableForFulfillment),
    reservedQty: parseInt0(body.reservedQty),
    batchesBalanceQty: parseInt0(body.batchesBalanceQty),
    mpBatchProducedQty: parseInt0(body.mpBatchProducedQty),
    dkksFactory: parseInt0(body.dkksFactory),
    huiliFactory: parseInt0(body.huiliFactory),
    bolanFactory: parseInt0(body.bolanFactory),
    jiadunFactory: parseInt0(body.jiadunFactory),
    jinjianFactory: parseInt0(body.jinjianFactory),
    huameiFactory: parseInt0(body.huameiFactory),
    shenzhenOffice: parseInt0(body.shenzhenOffice),
    taiwanFuhshing: parseInt0(body.taiwanFuhshing),
    singaporeOffice: parseInt0(body.singaporeOffice),
    cargohubWarehouse: parseInt0(body.cargohubWarehouse),
    koreaSolityFactory: parseInt0(body.koreaSolityFactory),
    vietnamSolityFactory: parseInt0(body.vietnamSolityFactory),
    aztechFactory: parseInt0(body.aztechFactory),
    swrFactory: parseInt0(body.swrFactory),
    vsFactory: parseInt0(body.vsFactory),
    ibeFactory: parseInt0(body.ibeFactory),
    smartWarehousing: parseInt0(body.smartWarehousing),
    omniWarehouse: parseInt0(body.omniWarehouse),
    amazonFba: parseInt0(body.amazonFba),
    safetyStockAtAmazon: parseInt0(body.safetyStockAtAmazon),
    jdmWarehouse: parseInt0(body.jdmWarehouse),
    amazon: parseInt0(body.amazon),
    syw: parseInt0(body.syw),
    inTransitStock: parseInt0(body.inTransitStock),
    inventoryReceivedDate: String(body.inventoryReceivedDate ?? "").trim() || null,
    agingDaysC: parseInt0(body.agingDaysC),
    unitPriceRmb: parseMoney(body.unitPriceRmb),
    unitPriceUsd: parseMoney(body.unitPriceUsd),
    batchesInventoryCostUsd: parseMoney(body.batchesInventoryCostUsd),
    skuInventoryCostUsd: parseMoney(body.skuInventoryCostUsd),
    chinaInventoryCostUsd: parseMoney(body.chinaInventoryCostUsd),
    singaporeInventoryCostUsd: parseMoney(body.singaporeInventoryCostUsd),
    singaporeCargohubInventoryCostUsd: parseMoney(body.singaporeCargohubInventoryCostUsd),
    koreaSolityInventoryCost: parseMoney(body.koreaSolityInventoryCost),
    vietnamSolityInventoryCostUsd: parseMoney(body.vietnamSolityInventoryCostUsd),
    usaOmniInventoryVostUsd: parseMoney(body.usaOmniInventoryVostUsd),
    usAmazonFba: parseMoney(body.usAmazonFba),
    europeJdmInventoryCostUsd: parseMoney(body.europeJdmInventoryCostUsd),
    inTransitInventoryCostUsd: parseMoney(body.inTransitInventoryCostUsd),
    createdBy: String(body.createdBy ?? "").trim() || "system",
  };
}

type InventoryGlobalPayload = Omit<InventoryGlobalEntry, "createdAt" | "updatedAt">;

function validateNumeric(entry: InventoryGlobalPayload): string | null {
  const intFields: (keyof InventoryGlobalPayload)[] = [
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
  const moneyFields: (keyof InventoryGlobalPayload)[] = [
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

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });
  const existing = await getInventoryGlobalEntryById(id);
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const mainSku = String(body.mainSku ?? "").trim();
  if (!mainSku || !isInventoryGlobalMainSku(mainSku)) {
    return NextResponse.json({ message: "Invalid or missing Main SKU" }, { status: 400 });
  }
  const payload = bodyToUpdate(body, id);
  payload.createdBy = existing.createdBy;
  const err = validateNumeric(payload);
  if (err) return NextResponse.json({ message: err }, { status: 400 });
  const entry = await updateInventoryGlobalEntry(payload);
  if (!entry) return NextResponse.json({ message: "Update failed" }, { status: 500 });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });
  const existing = await getInventoryGlobalEntryById(id);
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  await deleteInventoryGlobalEntryById(id);
  return NextResponse.json({ ok: true });
}
