import {
  forecastIncotermRequiresLandedCostInputs,
  normalizeForecastIncotermStored,
  type ForecastIncoterm,
} from "@/lib/forecast-incoterm";
import type { ForecastCashFlowRow, LogisticsLandedCostConsolidateSnapshot } from "@/lib/types";

/** Latest snapshot per PO by `updatedAt` / `createdAt` (legacy LCC table; cash flow no longer reads this). */
export function pickLatestLccSnapshotByPo(
  snapshots: readonly LogisticsLandedCostConsolidateSnapshot[],
): Map<string, LogisticsLandedCostConsolidateSnapshot> {
  const parseTs = (s: LogisticsLandedCostConsolidateSnapshot) => {
    const raw = (s.updatedAt || s.createdAt || "").trim();
    const t = raw ? Date.parse(raw) : 0;
    return Number.isFinite(t) ? t : 0;
  };
  const m = new Map<string, LogisticsLandedCostConsolidateSnapshot>();
  for (const snap of snapshots) {
    const po = (snap.poNumber || "").trim();
    if (!po) continue;
    const prev = m.get(po);
    if (!prev || parseTs(snap) >= parseTs(prev)) {
      m.set(po, snap);
    }
  }
  return m;
}

/**
 * Same total as Logistics → Landed cost consolidate: line total × (tariff %) + freight × qty.
 * Only when Forecast line incoterm is FOB/DAP/DDP.
 */
export function computeLogisticsForecastLandedTotalUsd(row: ForecastCashFlowRow): number | null {
  if (!forecastIncotermRequiresLandedCostInputs(row.incoterm)) return null;
  const qty = Number(row.buildToOrder) + Number(row.buildToStock);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  if (row.unitPriceUsd == null || !Number.isFinite(row.unitPriceUsd)) return null;
  const lineTotal = row.unitPriceUsd * qty;
  const tariff = row.cashFlowDestinationTariffPct;
  const freight = row.cashFlowFreightUsdPerUnit;
  const t = tariff != null && Number.isFinite(tariff) ? tariff : 0;
  const f = freight != null && Number.isFinite(freight) ? freight : 0;
  return lineTotal * (t / 100) + f * qty;
}

export type ForecastRowLandedMetrics = {
  landedPerUnit: number | null;
  totalUsd: number | null;
  displayIncoterm: ForecastIncoterm;
  /** True when this row is included in Landed cost cash flow (user saved from Logistics LCC). */
  usesConsolidateSnapshot: boolean;
  /** For departure lead (manufacturer bucket). */
  manufacturerCountry: string;
};

/**
 * Landed cost for cash flow when the user has published the row from Logistics → Landed cost consolidate
 * (Save next to Landed cost). Amounts follow the same formula as that page; departure uses PO issue + mfr + mode.
 */
export function computeForecastRowLandedMetrics(input: { row: ForecastCashFlowRow }): ForecastRowLandedMetrics {
  const { row } = input;
  const forecastLineIncoterm = normalizeForecastIncotermStored(row.incoterm);
  const mfg = (row.latestUnitCostQuote?.manufacturerCountry ?? "").trim();
  const displayIncoterm = row.cashFlowIncoterm ?? forecastLineIncoterm;

  if (!forecastIncotermRequiresLandedCostInputs(forecastLineIncoterm)) {
    return {
      landedPerUnit: null,
      totalUsd: null,
      displayIncoterm,
      usesConsolidateSnapshot: false,
      manufacturerCountry: mfg,
    };
  }

  const published = (row.landedCostCashFlowPublishedAt ?? "").trim();
  if (!published) {
    return {
      landedPerUnit: null,
      totalUsd: null,
      displayIncoterm,
      usesConsolidateSnapshot: false,
      manufacturerCountry: mfg,
    };
  }

  const totalUsd = computeLogisticsForecastLandedTotalUsd(row);
  const qty = Number(row.buildToOrder) + Number(row.buildToStock);
  const landedPerUnit =
    totalUsd != null && Number.isFinite(totalUsd) && Number.isFinite(qty) && qty > 0 ? totalUsd / qty : null;

  return {
    landedPerUnit,
    totalUsd,
    displayIncoterm,
    usesConsolidateSnapshot: true,
    manufacturerCountry: mfg,
  };
}
