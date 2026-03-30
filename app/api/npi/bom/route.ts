import { NextResponse } from "next/server";

import { createBomEntry, listBomEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { BomStatus } from "@/lib/types";

function isBomStatus(value: string): value is BomStatus {
  return value === "draft" || value === "released" || value === "obsolete";
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const entries = await listBomEntries();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const projectName = String(body.projectName ?? "").trim();
  const sku = String(body.sku ?? "").trim();
  const bomVersion = String(body.bomVersion ?? "").trim();
  const statusRaw = String(body.status ?? "draft").trim();
  const effectiveDateRaw = String(body.effectiveDate ?? "").trim();
  const componentCode = String(body.componentCode ?? "").trim();
  const componentName = String(body.componentName ?? "").trim();
  const specification = String(body.specification ?? "").trim();
  const quantityPer = Number(body.quantityPer ?? 0);
  const uom = String(body.uom ?? "PCS").trim();
  const supplierName = String(body.supplierName ?? "").trim();
  const unitCost = Number(body.unitCost ?? 0);
  const moq = Number(body.moq ?? 0);
  const leadTimeDays = Number(body.leadTimeDays ?? 0);
  const isCritical = Boolean(body.isCritical ?? false);
  const remarks = String(body.remarks ?? "").trim();

  if (!sku || !componentCode || !componentName) {
    return NextResponse.json({ message: "Missing required fields (SKU / component code / component name)" }, { status: 400 });
  }
  if (!isBomStatus(statusRaw)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }
  if ([quantityPer, unitCost, moq, leadTimeDays].some((n) => Number.isNaN(n) || !Number.isFinite(n) || n < 0)) {
    return NextResponse.json({ message: "Invalid numeric fields" }, { status: 400 });
  }
  const effectiveDate = effectiveDateRaw ? effectiveDateRaw.slice(0, 10) : null;

  try {
    const entry = await createBomEntry({
      projectName,
      sku,
      bomVersion,
      status: statusRaw,
      effectiveDate,
      componentCode,
      componentName,
      specification,
      quantityPer,
      uom,
      supplierName,
      unitCost,
      moq,
      leadTimeDays,
      isCritical,
      remarks,
      createdBy: session.username,
    });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create BOM entry failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
