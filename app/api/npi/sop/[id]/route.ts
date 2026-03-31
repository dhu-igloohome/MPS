import { NextResponse } from "next/server";

import { deleteSopEntryById, updateSopEntry } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { SopStatus } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

function isSopStatus(value: string): value is SopStatus {
  return value === "draft" || value === "in_review" || value === "released" || value === "obsolete";
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sopNo = String(body.sopNo ?? "").trim();
  const title = String(body.title ?? "").trim();
  const sku = String(body.sku ?? "").trim();
  const status = String(body.status ?? "draft").trim();
  if (!sopNo || !title || !sku) {
    return NextResponse.json({ message: "Missing required fields (SOP No / title / SKU)" }, { status: 400 });
  }
  if (!isSopStatus(status)) return NextResponse.json({ message: "Invalid SOP status" }, { status: 400 });
  const entry = await updateSopEntry({
    id,
    sopNo,
    title,
    productLine: String(body.productLine ?? "").trim(),
    sku,
    processStep: String(body.processStep ?? "").trim(),
    workstation: String(body.workstation ?? "").trim(),
    owner: String(body.owner ?? "").trim(),
    reviewer: String(body.reviewer ?? "").trim(),
    approver: String(body.approver ?? "").trim(),
    status,
    version: String(body.version ?? "V1.0").trim(),
    effectiveDate: String(body.effectiveDate ?? "").trim() || null,
    trainingRequired: Boolean(body.trainingRequired ?? false),
    safetyNotes: String(body.safetyNotes ?? "").trim(),
    keyCtq: String(body.keyCtq ?? "").trim(),
    controlMethod: String(body.controlMethod ?? "").trim(),
    attachmentUrl: String(body.attachmentUrl ?? "").trim(),
    remarks: String(body.remarks ?? "").trim(),
  });
  if (!entry) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });
  await deleteSopEntryById(id);
  return NextResponse.json({ ok: true });
}
