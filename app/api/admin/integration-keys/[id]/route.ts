import { NextResponse } from "next/server";

import { revokeIntegrationApiKeyById } from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const ok = await revokeIntegrationApiKeyById(id);
  if (!ok) return NextResponse.json({ message: "Not found or already revoked" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
