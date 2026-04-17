import { addCalendarDays } from "@/lib/cash-flow-overview";
import { forecastIncotermRequiresLandedCostInputs, type ForecastIncoterm } from "@/lib/forecast-incoterm";
import type { ForecastCashFlowShippingMode } from "@/lib/types";

/**
 * Greater China (mainland, Hong Kong, Macau, Taiwan) → shorter PO→departure leads.
 * Korea and all other origins use the longer lead (85 air / 90 ocean).
 */
export function landedCostManufacturerBucket(manufacturerCountry: string): "greaterChina" | "other" {
  const m = manufacturerCountry.trim().toLowerCase();
  if (!m) return "other";
  if (m === "hk" || m === "tw" || m === "mo" || m === "china" || m === "prc" || m === "cn") return "greaterChina";
  if (m.includes("hong kong") || m.includes("hongkong")) return "greaterChina";
  if (m.includes("taiwan")) return "greaterChina";
  if (m.includes("macau") || m.includes("macao")) return "greaterChina";
  if (/\bchina\b/.test(m)) return "greaterChina";
  return "other";
}

export function departureLeadDays(manufacturerCountry: string, mode: ForecastCashFlowShippingMode): number {
  const b = landedCostManufacturerBucket(manufacturerCountry);
  if (b === "greaterChina") return mode === "air" ? 70 : 75;
  return mode === "air" ? 85 : 90;
}

/**
 * Scheme 1: unitPrice × (1 + tariff/100) + freight (ocean or air).
 * Returns null when forecast incoterm is not FOB/DAP/DDP, or tariff is null, or unit price not finite.
 */
export function computeLandedCostPerUnitUsd(input: {
  forecastIncoterm: ForecastIncoterm;
  shippingMode: ForecastCashFlowShippingMode;
  unitPriceUsd: number | null;
  destinationTariffPct: number | null;
  seaFreightUsd: number | null;
  airFreightUsd: number | null;
}): number | null {
  if (!forecastIncotermRequiresLandedCostInputs(input.forecastIncoterm)) return null;
  if (input.destinationTariffPct == null) return null;
  const up = input.unitPriceUsd;
  if (up == null || !Number.isFinite(up)) return null;
  const freight =
    input.shippingMode === "ocean"
      ? input.seaFreightUsd ?? 0
      : input.airFreightUsd ?? 0;
  const t = Number(input.destinationTariffPct);
  if (!Number.isFinite(t)) return null;
  return up * (1 + t / 100) + freight;
}

export function computeDepartureDateYmd(
  poIssueDateYmd: string | null | undefined,
  manufacturerCountry: string,
  mode: ForecastCashFlowShippingMode,
): string | null {
  if (!poIssueDateYmd || !/^\d{4}-\d{2}-\d{2}$/.test(poIssueDateYmd)) return null;
  const days = departureLeadDays(manufacturerCountry, mode);
  return addCalendarDays(poIssueDateYmd, days);
}

export function computePaymentDueYmd(departureYmd: string | null | undefined): string | null {
  if (!departureYmd || !/^\d{4}-\d{2}-\d{2}$/.test(departureYmd)) return null;
  return addCalendarDays(departureYmd, 30);
}
