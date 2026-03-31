import { NextResponse } from "next/server";

import { createSopEntry, listSopEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { SopStatus } from "@/lib/types";

function isSopStatus(value: string): value is SopStatus {
  return value === "draft" || value === "in_review" || value === "released" || value === "obsolete";
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const entries = await listSopEntries();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sopNo = String(body.sopNo ?? "").trim();
  const title = String(body.title ?? "").trim();
  const sku = String(body.sku ?? "").trim();
  const status = String(body.status ?? "draft").trim();
  if (!sopNo || !title || !sku) {
    return NextResponse.json({ message: "Missing required fields (SOP No / title / SKU)" }, { status: 400 });
  }
  if (!isSopStatus(status)) return NextResponse.json({ message: "Invalid SOP status" }, { status: 400 });
  const entry = await createSopEntry({
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
    createdBy: session.username,
  });
  return NextResponse.json({ ok: true, entry });
}
