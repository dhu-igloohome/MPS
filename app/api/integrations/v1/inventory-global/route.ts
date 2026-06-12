import { NextResponse } from "next/server";

import { authenticateIntegrationRequest } from "@/lib/integration-api-auth";
import { listInventoryGlobalEntries } from "@/lib/repositories";

export async function GET(request: Request) {
  const principal = await authenticateIntegrationRequest(request, "inventory:read");
  if (!principal) {
    return NextResponse.json(
      { message: "Unauthorized. Use Authorization: Bearer mps_…" },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const mainSku = url.searchParams.get("mainSku")?.trim().toLowerCase() ?? "";

  let entries = await listInventoryGlobalEntries();
  if (mainSku) {
    entries = entries.filter((e) => e.mainSku.trim().toLowerCase() === mainSku);
  }

  return NextResponse.json({
    ok: true,
    count: entries.length,
    entries,
    fetchedAt: new Date().toISOString(),
  });
}
