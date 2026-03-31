import { NextResponse } from "next/server";

import { deleteQcCertificationEntryById, updateQcCertificationEntry } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { QcCertificationStatus } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };
function isStatus(v: string): v is QcCertificationStatus {
  return ["planning", "in_progress", "approved", "expired", "withdrawn"].includes(v);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const certificateNo = String(body.certificateNo ?? "").trim();
  const productSku = String(body.productSku ?? "").trim();
  const status = String(body.status ?? "planning").trim();
  if (!certificateNo || !productSku) return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  if (!isStatus(status)) return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  const entry = await updateQcCertificationEntry({
    id,
    certificateNo,
    productSku,
    productName: String(body.productName ?? "").trim(),
    region: String(body.region ?? "").trim(),
    standardName: String(body.standardName ?? "").trim(),
    certBody: String(body.certBody ?? "").trim(),
    status,
    applicationDate: String(body.applicationDate ?? "").trim() || null,
    issueDate: String(body.issueDate ?? "").trim() || null,
    expiryDate: String(body.expiryDate ?? "").trim() || null,
    reportUrl: String(body.reportUrl ?? "").trim(),
    owner: String(body.owner ?? "").trim(),
    notes: String(body.notes ?? "").trim(),
    createdBy: session.username,
  });
  if (!entry) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await deleteQcCertificationEntryById(id);
  return NextResponse.json({ ok: true });
}
