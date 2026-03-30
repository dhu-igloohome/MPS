import { NextResponse } from "next/server";

import { createEcnEntry, listEcnEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { EcnPriority, EcnStatus } from "@/lib/types";

function isEcnStatus(value: string): value is EcnStatus {
  return value === "draft" || value === "under_review" || value === "approved" || value === "implemented" || value === "rejected";
}
function isEcnPriority(value: string): value is EcnPriority {
  return value === "low" || value === "medium" || value === "high";
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const entries = await listEcnEntries();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const ecnNo = String(body.ecnNo ?? "").trim();
  const title = String(body.title ?? "").trim();
  const status = String(body.status ?? "draft").trim();
  const priority = String(body.priority ?? "medium").trim();
  const requester = String(body.requester ?? "").trim();
  const owner = String(body.owner ?? "").trim();
  const targetEffectiveDateRaw = String(body.targetEffectiveDate ?? "").trim();
  const actualEffectiveDateRaw = String(body.actualEffectiveDate ?? "").trim();
  const affectedSkus = String(body.affectedSkus ?? "").trim();
  const impactSummary = String(body.impactSummary ?? "").trim();
  const reason = String(body.reason ?? "").trim();
  const remarks = String(body.remarks ?? "").trim();

  if (!ecnNo || !title) {
    return NextResponse.json({ message: "Missing ECN no or title" }, { status: 400 });
  }
  if (!isEcnStatus(status) || !isEcnPriority(priority)) {
    return NextResponse.json({ message: "Invalid status/priority" }, { status: 400 });
  }

  try {
    const entry = await createEcnEntry({
      ecnNo,
      title,
      status,
      priority,
      requester,
      owner,
      targetEffectiveDate: targetEffectiveDateRaw ? targetEffectiveDateRaw.slice(0, 10) : null,
      actualEffectiveDate: actualEffectiveDateRaw ? actualEffectiveDateRaw.slice(0, 10) : null,
      affectedSkus,
      impactSummary,
      reason,
      remarks,
      createdBy: session.username,
    });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create ECN entry failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

