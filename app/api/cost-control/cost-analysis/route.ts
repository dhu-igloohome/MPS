import { NextResponse } from "next/server";

import { validateCostAnalysisRow } from "@/lib/cost-analysis-validation";
import type { CostFreightMode } from "@/lib/types";
import { createCostAnalysisEntry, listCostAnalysisEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

function parseFreightMode(raw: unknown): CostFreightMode | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (s === "air" || s === "空运") return "air";
  if (s === "sea" || s === "海运") return "sea";
  return null;
}

function parseBody(body: Record<string, unknown>) {
  const cmRegion = String(body.cmRegion ?? "").trim();
  const supplierName = String(body.supplierName ?? "").trim();
  const sku = String(body.sku ?? "").trim();
  const orderNumber = String(body.orderNumber ?? "").trim();
  const quantity = Number(body.quantity);
  const orderTotalWithTariff = Number(body.orderTotalWithTariff);
  const orderTotalWithoutTariff = Number(body.orderTotalWithoutTariff);
  const unitCostWithTariff = Number(body.unitCostWithTariff);
  const unitCostWithoutTariff = Number(body.unitCostWithoutTariff);
  const includesChinaVat = Boolean(body.includesChinaVat);
  const baseUnitCostUsd = Number(body.baseUnitCostUsd);
  const eeCost = Number(body.eeCost);
  const meCost = Number(body.meCost);
  const assemblyCost = Number(body.assemblyCost);
  const tariffPct = Number(body.tariffPct);
  const airFreightPerUnit = Number(body.airFreightPerUnit);
  const seaFreightPerUnit = Number(body.seaFreightPerUnit);
  const destinationCountry = String(body.destinationCountry ?? "").trim();
  const remarks = String(body.remarks ?? "").trim();
  const freightMode = parseFreightMode(body.freightMode);

  return {
    cmRegion,
    supplierName,
    sku,
    quantity,
    orderNumber,
    orderTotalWithTariff,
    orderTotalWithoutTariff,
    unitCostWithTariff,
    unitCostWithoutTariff,
    includesChinaVat,
    baseUnitCostUsd,
    eeCost,
    meCost,
    assemblyCost,
    tariffPct,
    airFreightPerUnit,
    seaFreightPerUnit,
    destinationCountry,
    freightMode,
    remarks,
  };
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const entries = await listCostAnalysisEntries();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const p = parseBody(body);

  if (!p.sku || !p.orderNumber || Number.isNaN(p.quantity) || p.quantity < 0) {
    return NextResponse.json({ message: "Missing SKU, order number, or invalid quantity" }, { status: 400 });
  }
  if (!p.freightMode) {
    return NextResponse.json({ message: "Invalid freight mode (use air/sea or 空运/海运)" }, { status: 400 });
  }

  const v = validateCostAnalysisRow({
    quantity: p.quantity,
    tariffPct: p.tariffPct,
    freightMode: p.freightMode,
  });
  if (!v.ok) {
    return NextResponse.json({ message: v.message }, { status: 400 });
  }

  const nums = [
    p.orderTotalWithTariff,
    p.orderTotalWithoutTariff,
    p.unitCostWithTariff,
    p.unitCostWithoutTariff,
    p.baseUnitCostUsd,
    p.eeCost,
    p.meCost,
    p.assemblyCost,
    p.airFreightPerUnit,
    p.seaFreightPerUnit,
  ];
  if (nums.some((n) => Number.isNaN(n) || !Number.isFinite(n))) {
    return NextResponse.json({ message: "Invalid numeric field" }, { status: 400 });
  }

  try {
    const entry = await createCostAnalysisEntry({
      ...p,
      freightMode: p.freightMode,
      createdBy: session.username,
    });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
