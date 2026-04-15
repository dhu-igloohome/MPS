import { NextResponse } from "next/server";

import { patchForecastCashFlowSettings } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const forecastId = String(body.forecastId ?? "").trim();
  const hasSupplier = Object.prototype.hasOwnProperty.call(body, "supplierName");
  const hasPo = Object.prototype.hasOwnProperty.call(body, "poIssueDate");
  const hasShippingMode = Object.prototype.hasOwnProperty.call(body, "shippingMode");

  if (!forecastId) {
    return NextResponse.json({ message: "forecastId is required" }, { status: 400 });
  }
  if (!hasSupplier && !hasPo && !hasShippingMode) {
    return NextResponse.json(
      { message: "supplierName, poIssueDate, and/or shippingMode is required" },
      { status: 400 },
    );
  }

  try {
    const supplierName = hasSupplier ? String(body.supplierName ?? "").trim() : undefined;
    const poIssueDate = hasPo
      ? body.poIssueDate === null || body.poIssueDate === ""
        ? null
        : String(body.poIssueDate).trim()
      : undefined;
    let shippingMode: "ocean" | "air" | undefined;
    if (hasShippingMode) {
      const shippingModeRaw = String(body.shippingMode ?? "").trim().toLowerCase();
      if (shippingModeRaw !== "ocean" && shippingModeRaw !== "air") {
        return NextResponse.json({ message: "shippingMode must be ocean or air" }, { status: 400 });
      }
      shippingMode = shippingModeRaw === "air" ? "air" : "ocean";
    }

    const {
      supplierName: savedSupplier,
      unitPriceUsd,
      poIssueDate: savedPo,
      shippingMode: savedShipping,
      latestUnitCostQuote,
    } = await patchForecastCashFlowSettings({
      forecastId,
      sessionRegions: session.regions,
      updatedBy: session.username,
      supplierName,
      poIssueDate,
      shippingMode,
    });
    return NextResponse.json({
      ok: true,
      supplierName: savedSupplier,
      unitPriceUsd,
      poIssueDate: savedPo,
      shippingMode: savedShipping,
      latestUnitCostQuote,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    const status =
      msg === "Forecast not found"
        ? 404
        : msg === "Forbidden"
          ? 403
          : msg === "Invalid forecast id" || msg === "Invalid poIssueDate"
            ? 400
            : msg === "supplierName, poIssueDate, or shippingMode is required"
              ? 400
              : 400;
    return NextResponse.json({ message: msg }, { status });
  }
}
