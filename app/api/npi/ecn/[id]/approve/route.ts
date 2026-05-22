import { NextResponse } from "next/server";

import { canUserActAsEcnApprover } from "@/lib/ecn-approval-config";
import { approveEcnApproval, getEcnApprovalById } from "@/lib/ecn-approval-repository";
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
  try {
    const entry = await approveEcnApproval(id, session.username, {
      superAdmin: session.role === "super_admin",
    });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Approve failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
