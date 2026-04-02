import { NextResponse } from "next/server";

import {
  deleteMassProductionKanbanById,
  getMassProductionKanbanById,
  orderProgressRegionsForSession,
  updateMassProductionKanban,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { OrderProgressRegion } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type RouteContext = { params: Promise<{ id: string }> };

function isOrderProgressRegion(value: string): value is OrderProgressRegion {
  return value === "APAC" || value === "EU" || value === "US";
}

function parseOptionalDate(value: unknown, field: string): string | null | NextResponse {
  const s = String(value ?? "").trim();
  if (!s) return null;
  if (!DATE_RE.test(s)) {
    return NextResponse.json({ message: `Invalid date: ${field}` }, { status: 400 });
  }
  return s;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getMassProductionKanbanById(id);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const allowed = orderProgressRegionsForSession(session.regions);
  if (!allowed.includes(existing.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const productId = String(body.productId ?? "").trim();
  const quantity = Number(body.quantity);
  const mp = String(body.mp ?? "");
  const region = String(body.region ?? "");

  const ee = parseOptionalDate(body.ee, "EE");
  if (ee instanceof NextResponse) return ee;
  const me = parseOptionalDate(body.me, "ME");
  if (me instanceof NextResponse) return me;
  const smt = parseOptionalDate(body.smt, "SMT");
  if (smt instanceof NextResponse) return smt;
  const assembly = parseOptionalDate(body.assembly, "Assembly");
  if (assembly instanceof NextResponse) return assembly;
  const productionReport = parseOptionalDate(body.productionReport, "Production report");
  if (productionReport instanceof NextResponse) return productionReport;
  const cooApproval = parseOptionalDate(body.cooApproval, "COO approval");
  if (cooApproval instanceof NextResponse) return cooApproval;
  const deliver = parseOptionalDate(body.deliver, "Deliver");
  if (deliver instanceof NextResponse) return deliver;

  if (!productId) {
    return NextResponse.json({ message: "Product (SKU) is required" }, { status: 400 });
  }
  if (!Number.isInteger(quantity) || quantity < 0) {
    return NextResponse.json({ message: "Invalid quantity" }, { status: 400 });
  }
  if (!isOrderProgressRegion(region)) {
    return NextResponse.json({ message: "Invalid region" }, { status: 400 });
  }
  if (!allowed.includes(region)) {
    return NextResponse.json({ message: "Region not allowed" }, { status: 403 });
  }

  try {
    const entry = await updateMassProductionKanban({
      id,
      productId,
      quantity,
      mp,
      ee,
      me,
      smt,
      assembly,
      productionReport,
      cooApproval,
      deliver,
      region,
    });
    if (!entry) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await getMassProductionKanbanById(id);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  const allowed = orderProgressRegionsForSession(session.regions);
  if (!allowed.includes(existing.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  await deleteMassProductionKanbanById(id);
  return NextResponse.json({ ok: true });
}
