import { NextResponse } from "next/server";

import {
  computeCostAnalysisDerived,
  parseChinaVat,
  parseDestination,
} from "@/lib/cost-analysis-compute";
import { validateCostAnalysisRow } from "@/lib/cost-analysis-validation";
import type { CostFreightMode } from "@/lib/types";
import { deleteCostAnalysisEntryById, updateCostAnalysisEntryById } from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

function parseFreightMode(raw: unknown): CostFreightMode | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "air" || s === "空运") return "air";
  if (s === "sea" || s === "海运") return "sea";
  return null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const cmRegion = String(body.cmRegion ?? "").trim();
  const supplierName = String(body.supplierName ?? "").trim();
  const sku = String(body.sku ?? "").trim();
  const orderNumber = String(body.orderNumber ?? "").trim();
  const quantity = Number(body.quantity);
  const eeCost = Number(body.eeCost);
  const meCost = Number(body.meCost);
  const assemblyCost = Number(body.assemblyCost);
  const tariffPct = Number(body.tariffPct);
  const airFreightPerUnit = Number(body.airFreightPerUnit);
  const seaFreightPerUnit = Number(body.seaFreightPerUnit);
  const remarks = String(body.remarks ?? "").trim();
  const freightMode = parseFreightMode(body.freightMode);
  const destinationCountry = parseDestination(body.destinationCountry);
  const includesChinaVat = parseChinaVat(body.includesChinaVat);

  if (!sku || !orderNumber || Number.isNaN(quantity) || quantity < 0) {
    return NextResponse.json({ message: "Missing SKU, order number, or invalid quantity" }, { status: 400 });
  }
  if (!freightMode) {
    return NextResponse.json({ message: "Invalid freight mode" }, { status: 400 });
  }
  if (!destinationCountry) {
    return NextResponse.json({ message: "目的地须选择 APAC / EU / USA" }, { status: 400 });
  }

  const v = validateCostAnalysisRow({
    quantity,
    tariffPct,
    freightMode,
    eeCost,
    meCost,
    assemblyCost,
    airFreightPerUnit,
    seaFreightPerUnit,
  });
  if (!v.ok) return NextResponse.json({ message: v.message }, { status: 400 });

  const derived = computeCostAnalysisDerived({
    eeCost,
    meCost,
    assemblyCost,
    tariffPct,
    airFreightPerUnit,
    seaFreightPerUnit,
    freightMode,
    quantity,
  });

  try {
    const entry = await updateCostAnalysisEntryById(id, {
      cmRegion,
      supplierName,
      sku,
      quantity,
      orderNumber,
      orderTotalWithTariff: derived.orderTotalWithTariff,
      orderTotalWithoutTariff: derived.orderTotalWithoutTariff,
      unitCostWithTariff: derived.unitCostWithTariff,
      unitCostWithoutTariff: derived.unitCostWithoutTariff,
      includesChinaVat,
      baseUnitCostUsd: derived.baseUnitCostUsd,
      eeCost,
      meCost,
      assemblyCost,
      tariffPct,
      airFreightPerUnit,
      seaFreightPerUnit,
      destinationCountry,
      freightMode,
      remarks,
    });
    if (!entry) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const ok = await deleteCostAnalysisEntryById(id);
  if (!ok) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
