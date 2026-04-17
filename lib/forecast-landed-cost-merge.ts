import { normalizeForecastIncotermStored, type ForecastIncoterm } from "@/lib/forecast-incoterm";
import { computeLandedCostPerUnitUsd } from "@/lib/landed-cost-cash-flow";
import type {
  ForecastCashFlowRow,
  LogisticsLandedCostConsolidateSnapshot,
  UnitCostQuoteEntry,
} from "@/lib/types";

/** Latest snapshot per PO by `updatedAt` / `createdAt` (for cross-user “source of truth”). */
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

/** Latest unit-cost quote for SKU + supplier on or before `asOfDateYmd` (YYYY-MM-DD). */
export function resolveQuoteForRow(
  row: ForecastCashFlowRow,
  quotes: readonly UnitCostQuoteEntry[],
  asOfDateYmd: string,
): UnitCostQuoteEntry | null {
  const sku = row.sku.trim();
  const sup = row.cashFlowSupplierName.trim();
  if (!sup) return null;
  const cutoff = asOfDateYmd.trim();
  const candidates = quotes.filter((q) => {
    if (q.sku.trim() !== sku || q.supplierName.trim() !== sup) return false;
    if (!cutoff) return true;
    return q.quoteDate <= cutoff;
  });
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const c = b.quoteDate.localeCompare(a.quoteDate);
    if (c !== 0) return c;
    return Number(b.id) - Number(a.id);
  })[0]!;
}

export type ForecastRowLandedMetrics = {
  landedPerUnit: number | null;
  totalUsd: number | null;
  displayIncoterm: ForecastIncoterm;
  usesConsolidateSnapshot: boolean;
  /** For departure lead (manufacturer bucket). */
  manufacturerCountry: string;
};

/**
 * Landed cost for a forecast cash-flow row **only** when a Landed cost consolidate snapshot exists for that PO
 * (after Create or Save in Logistics). Tariff / freight / incoterm follow the snapshot; numeric gaps fall back to
 * unit-cost quotes as-of the snapshot quote date. With no snapshot, landed totals stay empty (no quote-only path).
 */
export function computeForecastRowLandedMetrics(input: {
  row: ForecastCashFlowRow;
  latestLccByPo: Map<string, LogisticsLandedCostConsolidateSnapshot>;
  quotes: readonly UnitCostQuoteEntry[];
}): ForecastRowLandedMetrics {
  const { row, latestLccByPo, quotes } = input;
  const po = (row.poNumber || "").trim();
  const snap = po ? latestLccByPo.get(po) ?? null : null;
  const qRow = row.latestUnitCostQuote;

  if (!snap) {
    return {
      landedPerUnit: null,
      totalUsd: null,
      displayIncoterm: normalizeForecastIncotermStored(row.incoterm),
      usesConsolidateSnapshot: false,
      manufacturerCountry: (qRow?.manufacturerCountry ?? "").trim(),
    };
  }

  let manufacturerCountry = "";
  if (quotes.length) {
    const qAsOf = resolveQuoteForRow(row, quotes, snap.quoteDate);
    manufacturerCountry = (qAsOf?.manufacturerCountry ?? qRow?.manufacturerCountry ?? "").trim();
  } else {
    manufacturerCountry = (qRow?.manufacturerCountry ?? "").trim();
  }

  const qAsOf = quotes.length ? resolveQuoteForRow(row, quotes, snap.quoteDate) : qRow;
  const unit =
    qAsOf != null
      ? qAsOf.unitPrice
      : row.unitPriceUsd != null && Number.isFinite(row.unitPriceUsd)
        ? row.unitPriceUsd
        : null;
  const tariff =
    snap.destinationTariffPct ?? qAsOf?.destinationTariffPct ?? qRow?.destinationTariffPct ?? null;
  const sea = snap.seaFreightUsd ?? qAsOf?.seaFreightUnitPrice ?? qRow?.seaFreightUnitPrice ?? null;
  const air = snap.airFreightUsd ?? qAsOf?.airFreightUnitPrice ?? qRow?.airFreightUnitPrice ?? null;
  const incoterm = normalizeForecastIncotermStored(snap.incoterm);
  const landed = computeLandedCostPerUnitUsd({
    forecastIncoterm: incoterm,
    shippingMode: row.cashFlowShippingMode,
    unitPriceUsd: unit,
    destinationTariffPct: tariff,
    seaFreightUsd: sea,
    airFreightUsd: air,
  });
  const qty = Number(row.buildToOrder) + Number(row.buildToStock);
  const totalUsd = landed != null && Number.isFinite(qty) && qty > 0 ? landed * qty : null;
  return {
    landedPerUnit: landed,
    totalUsd,
    displayIncoterm: incoterm,
    usesConsolidateSnapshot: true,
    manufacturerCountry,
  };
}
