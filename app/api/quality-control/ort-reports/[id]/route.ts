import { NextResponse } from "next/server";

import { deleteQcOrtReportEntryById, updateQcOrtReportEntry } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { QcOrtResult } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };
function isResult(v: string): v is QcOrtResult {
  return v === "on_going" || v === "pass" || v === "fail";
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ortNo = String(body.ortNo ?? "").trim();
  const productSku = String(body.productSku ?? "").trim();
  const resultSummary = String(body.resultSummary ?? "on_going").trim();
  const sampleSize = Number(body.sampleSize ?? 0);
  const failCount = Number(body.failCount ?? 0);
  if (!ortNo || !productSku) return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  if (!isResult(resultSummary)) return NextResponse.json({ message: "Invalid result" }, { status: 400 });
  if ([sampleSize, failCount].some((v) => Number.isNaN(v) || v < 0)) return NextResponse.json({ message: "Invalid numeric fields" }, { status: 400 });
  const entry = await updateQcOrtReportEntry({
    id,
    ortNo,
    productSku,
    batchNo: String(body.batchNo ?? "").trim(),
    factory: String(body.factory ?? "").trim(),
    sampleSize,
    testItems: String(body.testItems ?? "").trim(),
    environmentProfile: String(body.environmentProfile ?? "").trim(),
    duration: String(body.duration ?? "").trim(),
    resultSummary,
    failCount,
    failModes: String(body.failModes ?? "").trim(),
    actionTaken: String(body.actionTaken ?? "").trim(),
    owner: String(body.owner ?? "").trim(),
    startDate: String(body.startDate ?? "").trim() || null,
    endDate: String(body.endDate ?? "").trim() || null,
    reportUrl: String(body.reportUrl ?? "").trim(),
    createdBy: session.username,
  });
  if (!entry) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  await deleteQcOrtReportEntryById(id);
  return NextResponse.json({ ok: true });
}
