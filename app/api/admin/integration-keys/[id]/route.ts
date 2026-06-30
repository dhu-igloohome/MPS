import { NextResponse } from "next/server";

import { isIntegrationApiScope } from "@/lib/integration-api-key";
import { revokeIntegrationApiKeyById, updateIntegrationApiKeyScopes } from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const rawScopes = Array.isArray(body.scopes) ? body.scopes : [];
  const scopes = rawScopes.map((s) => String(s).trim()).filter(Boolean);
  if (scopes.length === 0 || scopes.some((s) => !isIntegrationApiScope(s))) {
    return NextResponse.json(
      { message: "Invalid scopes. Allowed: inventory:read, fulfillment:read" },
      { status: 400 },
    );
  }

  const entry = await updateIntegrationApiKeyScopes(id, scopes);
  if (!entry) return NextResponse.json({ message: "Not found or revoked" }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}

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
