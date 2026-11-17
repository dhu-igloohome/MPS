import type { ForecastIncoterm } from "@/lib/forecast-incoterm";
import type { ForecastRegion } from "@/lib/types";

/**
 * Entry defaults for the Forecast form, taken from how the team actually filled it in
 * (172 rows, May–Nov 2026): every region has one dominant destination, and the Incoterm
 * follows the destination only loosely — so these are PRE-FILLS the user can change, never rules.
 */

/** How many months ahead people forecast: 89% of rows were created 4 or 5 months before their month. */
export const FORECAST_DEFAULT_LEAD_MONTHS = 4;

/** `YYYY-MM` of `now` plus `months` (local calendar), e.g. (2026-11-17, 4) → "2027-03". */
export function defaultForecastMonthKey(now: Date, months: number = FORECAST_DEFAULT_LEAD_MONTHS): string {
  const d = new Date(now.getFullYear(), now.getMonth() + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const REGION_DEFAULT_DESTINATION: Partial<Record<ForecastRegion, string>> = {
  EU: "Ireland",
  USA: "United States",
  APAC: "Singapore",
};

/** Dominant destination for a region ("" for OPS Department / unknown — nothing to guess). */
export function defaultDestinationForRegion(region: ForecastRegion): string {
  return REGION_DEFAULT_DESTINATION[region] ?? "";
}

const DESTINATION_DEFAULT_INCOTERM: Record<string, ForecastIncoterm> = {
  Ireland: "DAP",
  "United States": "DDP",
  Singapore: "EXW",
};

/** Most common Incoterm for a destination; EXW (the form's old default) for everything else. */
export function defaultIncotermForDestination(destination: string): ForecastIncoterm {
  return DESTINATION_DEFAULT_INCOTERM[destination.trim()] ?? "EXW";
}

/** Destinations offered at the top of the country list (the 5 that cover 95% of rows). */
export const COMMON_FORECAST_DESTINATIONS = ["Ireland", "United States", "Singapore", "Australia", "China"] as const;

export type QuantityKind = "bts" | "bto" | "both";

/** Move the typed quantity when the user switches kind, so switching never loses the number. */
export function switchQuantityKind(
  from: QuantityKind,
  to: QuantityKind,
  bto: string,
  bts: string,
): { buildToOrder: string; buildToStock: string } {
  if (to === "both" || from === to) return { buildToOrder: bto, buildToStock: bts };
  // Leaving "split" folds both numbers into one so the total is never silently dropped.
  const qty = from === "bto" ? bto : from === "bts" ? bts : String(Number(bto || 0) + Number(bts || 0));
  return to === "bto" ? { buildToOrder: qty, buildToStock: "0" } : { buildToOrder: "0", buildToStock: qty };
}
