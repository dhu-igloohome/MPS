import { NextResponse } from "next/server";

import { parseForecastIncoterm, type ForecastIncoterm } from "@/lib/forecast-incoterm";
import { patchForecastCashFlowSettings } from "@/lib/repositories";
import { getSession } from "@/lib/session";

function optNonNegNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

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
  const hasDestTariff = Object.prototype.hasOwnProperty.call(body, "destinationTariffPct");
  const hasFreight = Object.prototype.hasOwnProperty.call(body, "freightUsdPerUnit");
  const hasCfInc = Object.prototype.hasOwnProperty.call(body, "cashFlowIncoterm");

  if (!forecastId) {
    return NextResponse.json({ message: "forecastId is required" }, { status: 400 });
  }
  if (
    !hasSupplier &&
    !hasPo &&
    !hasShippingMode &&
    !hasDestTariff &&
    !hasFreight &&
    !hasCfInc
  ) {
    return NextResponse.json(
      {
        message:
          "supplierName, poIssueDate, shippingMode, destinationTariffPct, freightUsdPerUnit, and/or cashFlowIncoterm is required",
      },
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

    let destinationTariffPct: number | null | undefined;
    if (hasDestTariff) {
      if (body.destinationTariffPct === null || body.destinationTariffPct === "") {
        destinationTariffPct = null;
      } else {
        const n = Number(body.destinationTariffPct);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return NextResponse.json({ message: "destinationTariffPct must be between 0 and 100" }, { status: 400 });
        }
        destinationTariffPct = n;
      }
    }

    let freightUsdPerUnit: number | null | undefined;
    if (hasFreight) {
      if (body.freightUsdPerUnit === null || body.freightUsdPerUnit === "") {
        freightUsdPerUnit = null;
      } else {
        const n = optNonNegNumber(body.freightUsdPerUnit);
        if (n === null) {
          return NextResponse.json({ message: "freightUsdPerUnit must be a non-negative number" }, { status: 400 });
        }
        freightUsdPerUnit = n;
      }
    }

    let cashFlowIncoterm: ForecastIncoterm | null | undefined;
    if (hasCfInc) {
      if (body.cashFlowIncoterm === null || body.cashFlowIncoterm === "") {
        cashFlowIncoterm = null;
      } else {
        const p = parseForecastIncoterm(body.cashFlowIncoterm);
        if (!p) {
          return NextResponse.json({ message: "Invalid cashFlowIncoterm" }, { status: 400 });
        }
        cashFlowIncoterm = p;
      }
    }

    const patchInput: Parameters<typeof patchForecastCashFlowSettings>[0] = {
      forecastId,
      sessionRegions: session.regions,
      updatedBy: session.username,
    };
    if (hasSupplier) patchInput.supplierName = supplierName;
    if (hasPo) patchInput.poIssueDate = poIssueDate;
    if (hasShippingMode) patchInput.shippingMode = shippingMode;
    if (hasDestTariff) patchInput.destinationTariffPct = destinationTariffPct!;
    if (hasFreight) patchInput.freightUsdPerUnit = freightUsdPerUnit!;
    if (hasCfInc) patchInput.cashFlowIncoterm = cashFlowIncoterm!;

    const {
      supplierName: savedSupplier,
      unitPriceUsd,
      poIssueDate: savedPo,
      shippingMode: savedShipping,
      latestUnitCostQuote,
      destinationTariffPct: savedTariff,
      freightUsdPerUnit: savedFreight,
      cashFlowIncoterm: savedInc,
    } = await patchForecastCashFlowSettings(patchInput);
    return NextResponse.json({
      ok: true,
      supplierName: savedSupplier,
      unitPriceUsd,
      poIssueDate: savedPo,
      shippingMode: savedShipping,
      latestUnitCostQuote,
      destinationTariffPct: savedTariff,
      freightUsdPerUnit: savedFreight,
      cashFlowIncoterm: savedInc,
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
            : msg.includes("required")
              ? 400
              : 400;
    return NextResponse.json({ message: msg }, { status });
  }
}
