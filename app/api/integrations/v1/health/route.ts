import { NextResponse } from "next/server";

import { authenticateIntegrationRequest } from "@/lib/integration-api-auth";

export async function GET(request: Request) {
  const principal = await authenticateIntegrationRequest(request, "inventory:read");
  if (!principal) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    label: principal.label,
    scopes: principal.scopes,
  });
}
