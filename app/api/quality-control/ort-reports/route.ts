import { NextResponse } from "next/server";

import { createQcOrtReportEntry, listQcOrtReportEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { QcOrtResult } from "@/lib/types";

function isResult(v: string): v is QcOrtResult {
  return v === "on_going" || v === "pass" || v === "fail";
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const entries = await listQcOrtReportEntries();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ortNo = String(body.ortNo ?? "").trim();
  const productSku = String(body.productSku ?? "").trim();
  const resultSummary = String(body.resultSummary ?? "on_going").trim();
  const sampleSize = Number(body.sampleSize ?? 0);
  const failCount = Number(body.failCount ?? 0);
  if (!ortNo || !productSku) return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  if (!isResult(resultSummary)) return NextResponse.json({ message: "Invalid result" }, { status: 400 });
  if ([sampleSize, failCount].some((v) => Number.isNaN(v) || v < 0)) return NextResponse.json({ message: "Invalid numeric fields" }, { status: 400 });
  const entry = await createQcOrtReportEntry({
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
  return NextResponse.json({ ok: true, entry });
}
