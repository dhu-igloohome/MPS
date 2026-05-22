import { NextResponse } from "next/server";

import { canUserActAsEcnApprover } from "@/lib/ecn-approval-config";
import { getEcnApprovalById, rejectEcnApproval } from "@/lib/ecn-approval-repository";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const existing = await getEcnApprovalById(id);
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (
    !canUserActAsEcnApprover(session.username, existing.approvalDepartment, session.role)
  ) {
    return NextResponse.json({ message: "You are not an approver for this department" }, { status: 403 });
  }
  const body = (await request.json().catch(() => ({}))) as { reason?: string };
  const reason = String(body.reason ?? "").trim();
  if (!reason) return NextResponse.json({ message: "Rejection reason is required" }, { status: 400 });
  try {
    const entry = await rejectEcnApproval(id, session.username, reason);
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Reject failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
