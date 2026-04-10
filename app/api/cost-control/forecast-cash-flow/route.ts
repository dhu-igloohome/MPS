import { NextResponse } from "next/server";

import { upsertForecastCashFlowSupplier } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const forecastId = String(body.forecastId ?? "").trim();
  const supplierName = String(body.supplierName ?? "").trim();

  if (!forecastId) {
    return NextResponse.json({ message: "forecastId is required" }, { status: 400 });
  }

  try {
    const { unitPriceUsd } = await upsertForecastCashFlowSupplier({
      forecastId,
      supplierName,
      sessionRegions: session.regions,
      updatedBy: session.username,
    });
    return NextResponse.json({ ok: true, supplierName, unitPriceUsd });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    const status =
      msg === "Forecast not found" ? 404 : msg === "Forbidden" ? 403 : msg === "Invalid forecast id" ? 400 : 400;
    return NextResponse.json({ message: msg }, { status });
  }
}
