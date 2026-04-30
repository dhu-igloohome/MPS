import { NextResponse } from "next/server";

import {
  getOrderProgressById,
  sessionCanAccessOrderProgressRegion,
  updateOrderFulfillmentById,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 });
  }

  const existing = await getOrderProgressById(id);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (!sessionCanAccessOrderProgressRegion(session.regions, existing.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const targetCompletion = String(body.targetCompletion ?? "").trim();
  const salesOrderNumber = String(body.salesOrderNumber ?? "").trim();
  const shipFrom = String(body.shipFrom ?? "").trim();
  const shipTo = String(body.shipTo ?? "").trim();
  const etdRaw = String(body.etd ?? "").trim();
  const etaRaw = String(body.eta ?? "").trim();
  const trackingLink = String(body.trackingLink ?? "").trim();
  const mpBatch = String(body.mpBatch ?? "").trim();
  const balanceQty = Number(body.balanceQty ?? 0);

  const etd = etdRaw ? (DATE_RE.test(etdRaw) ? etdRaw : null) : null;
  const eta = etaRaw ? (DATE_RE.test(etaRaw) ? etaRaw : null) : null;
  if (etdRaw && !etd) {
    return NextResponse.json({ message: "Invalid ETD date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (etaRaw && !eta) {
    return NextResponse.json({ message: "Invalid ETA date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (!Number.isFinite(balanceQty) || !Number.isInteger(balanceQty) || balanceQty < 0) {
    return NextResponse.json({ message: "Invalid balance qty" }, { status: 400 });
  }

  const entry = await updateOrderFulfillmentById({
    id,
    targetCompletion,
    salesOrderNumber,
    shipFrom,
    shipTo,
    etd,
    eta,
    trackingLink,
    mpBatch,
    balanceQty,
  });

  if (!entry) {
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entry });
}

