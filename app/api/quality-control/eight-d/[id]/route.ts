import { NextResponse } from "next/server";

import { deleteQc8dReportEntryById, updateQc8dReportEntry } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { Qc8dSeverity, Qc8dStatus } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };
function isSeverity(v: string): v is Qc8dSeverity {
  return ["S1", "S2", "S3", "S4"].includes(v);
}
function isStatus(v: string): v is Qc8dStatus {
  return ["open", "containment", "root_caused", "implemented", "verified", "closed"].includes(v);
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const reportNo = String(body.reportNo ?? "").trim();
  const issueTitle = String(body.issueTitle ?? "").trim();
  const productSku = String(body.productSku ?? "").trim();
  const severity = String(body.severity ?? "S3").trim();
  const status = String(body.status ?? "open").trim();
  const affectedQuantity = Number(body.affectedQuantity ?? 0);
  const costImpact = Number(body.costImpact ?? 0);
  if (!reportNo || !issueTitle || !productSku) return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  if (!isSeverity(severity) || !isStatus(status)) return NextResponse.json({ message: "Invalid enum fields" }, { status: 400 });
  if ([affectedQuantity, costImpact].some((v) => Number.isNaN(v) || v < 0)) return NextResponse.json({ message: "Invalid numeric fields" }, { status: 400 });
  const entry = await updateQc8dReportEntry({
    id,
    reportNo,
    issueTitle,
    productSku,
    customer: String(body.customer ?? "").trim(),
    region: String(body.region ?? "").trim(),
    severity,
    status,
    owner: String(body.owner ?? "").trim(),
    d3Containment: String(body.d3Containment ?? "").trim(),
    d4RootCause: String(body.d4RootCause ?? "").trim(),
    d5CorrectiveAction: String(body.d5CorrectiveAction ?? "").trim(),
    d6ImplementationPlan: String(body.d6ImplementationPlan ?? "").trim(),
    dateOpened: String(body.dateOpened ?? "").trim() || null,
    dateClosed: String(body.dateClosed ?? "").trim() || null,
    affectedQuantity,
    costImpact,
    remarks: String(body.remarks ?? "").trim(),
    createdBy: session.username,
  });
  if (!entry) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await deleteQc8dReportEntryById(id);
  return NextResponse.json({ ok: true });
}
