import { NextResponse } from "next/server";

import { createQcTestCaseEntry, listQcTestCaseEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { QcTestCaseCategory, QcTestCasePriority, QcTestCaseStatus } from "@/lib/types";

function isCategory(v: string): v is QcTestCaseCategory {
  return ["functional", "security", "reliability", "compatibility", "ota", "performance"].includes(v);
}
function isPriority(v: string): v is QcTestCasePriority {
  return v === "P0" || v === "P1" || v === "P2";
}
function isStatus(v: string): v is QcTestCaseStatus {
  return v === "draft" || v === "reviewed" || v === "released" || v === "obsolete";
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const entries = await listQcTestCaseEntries();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const testCaseId = String(body.testCaseId ?? "").trim();
  const title = String(body.title ?? "").trim();
  const productSku = String(body.productSku ?? "").trim();
  const category = String(body.category ?? "functional").trim();
  const priority = String(body.priority ?? "P1").trim();
  const status = String(body.status ?? "draft").trim();
  if (!testCaseId || !title || !productSku) return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  if (!isCategory(category) || !isPriority(priority) || !isStatus(status)) {
    return NextResponse.json({ message: "Invalid enum fields" }, { status: 400 });
  }
  const entry = await createQcTestCaseEntry({
    testCaseId,
    title,
    productSku,
    firmwareVersion: String(body.firmwareVersion ?? "").trim(),
    moduleName: String(body.moduleName ?? "").trim(),
    category,
    priority,
    status,
    preconditions: String(body.preconditions ?? "").trim(),
    steps: String(body.steps ?? "").trim(),
    expectedResult: String(body.expectedResult ?? "").trim(),
    environment: String(body.environment ?? "").trim(),
    owner: String(body.owner ?? "").trim(),
    remarks: String(body.remarks ?? "").trim(),
    createdBy: session.username,
  });
  return NextResponse.json({ ok: true, entry });
}
