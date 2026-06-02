import { NextResponse } from "next/server";

import {
  approveSkuProductRequest,
  rejectSkuProductRequest,
} from "@/lib/sku-product-request-repository";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "").trim();

  try {
    if (action === "approve") {
      const entry = await approveSkuProductRequest(id, session.username);
      return NextResponse.json({ ok: true, entry });
    }
    if (action === "reject") {
      const reviewComment = String(body.reviewComment ?? "");
      const entry = await rejectSkuProductRequest(id, session.username, reviewComment);
      return NextResponse.json({ ok: true, entry });
    }
    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
