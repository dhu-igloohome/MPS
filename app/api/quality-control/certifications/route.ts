import { NextResponse } from "next/server";

import { createQcCertificationEntry, listQcCertificationEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { QcCertificationStatus } from "@/lib/types";

function isStatus(v: string): v is QcCertificationStatus {
  return ["planning", "in_progress", "approved", "expired", "withdrawn"].includes(v);
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const entries = await listQcCertificationEntries();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const certificateNo = String(body.certificateNo ?? "").trim();
  const productSku = String(body.productSku ?? "").trim();
  const status = String(body.status ?? "planning").trim();
  if (!certificateNo || !productSku) return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  if (!isStatus(status)) return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  const entry = await createQcCertificationEntry({
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
  return NextResponse.json({ ok: true, entry });
}
