import { NextResponse } from "next/server";

import {
  createMassProductionKanban,
  listMassProductionKanbanBySessionRegions,
  orderProgressRegionsForSession,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { OrderProgressRegion } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

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

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const entries = await listMassProductionKanbanBySessionRegions(session.regions);
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
  const ort = parseOptionalDate(body.ort, "ORT");
  if (ort instanceof NextResponse) return ort;
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
  if (!orderProgressRegionsForSession(session.regions).includes(region)) {
    return NextResponse.json({ message: "Region not allowed" }, { status: 403 });
  }

  try {
    const entry = await createMassProductionKanban({
      productId,
      quantity,
      mp,
      ee,
      me,
      smt,
      assembly,
      productionReport,
      ort,
      cooApproval,
      deliver,
      region,
      createdBy: session.username,
    });
    return NextResponse.json({ entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
