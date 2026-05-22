import { NextResponse } from "next/server";

import { getEcnApprovalById, submitEcnApproval } from "@/lib/ecn-approval-repository";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const existing = await getEcnApprovalById(id);
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (existing.createdBy !== session.username && session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  try {
    const entry = await submitEcnApproval(id);
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Submit failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
