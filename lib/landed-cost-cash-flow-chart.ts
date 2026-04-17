import {
  forecastDestinationDisplay,
  type ForecastDestinationOption,
} from "@/lib/forecast-destination-countries";
import type { Language } from "@/lib/i18n";
import { computeForecastRowLandedMetrics } from "@/lib/forecast-landed-cost-merge";
import { computeDepartureDateYmd, computePaymentDueYmd } from "@/lib/landed-cost-cash-flow";
import type { ForecastCashFlowRow } from "@/lib/types";

export type LandedCostBarRowInput = {
  rowId: string;
  sku: string;
  destinationLabel: string;
  totalUsd: number;
  /** YYYY-MM-DD */
  paymentDueYmd: string;
};

export type LandedCostBarSeriesMeta = {
  sku: string;
  destinationLabel: string;
  paymentDueYmd: string;
  totalUsd: number;
  stackKey: string;
};

export function landedCostStackKey(rowId: string): string {
  return `lc_${rowId}`;
}

/** Same landed-cost / total / payment due rules as the Landed cost cash flow table. */
export function buildLandedCostBarRowInputs(
  rows: ForecastCashFlowRow[],
  language: Language,
  destinationOptions: readonly ForecastDestinationOption[],
): LandedCostBarRowInput[] {
  const out: LandedCostBarRowInput[] = [];
  for (const row of rows) {
    const m = computeForecastRowLandedMetrics({ row });
    const totalUsd = m.totalUsd;
    if (totalUsd == null || !Number.isFinite(totalUsd) || totalUsd <= 0) continue;
    const depYmd = computeDepartureDateYmd(
      row.poIssueDate,
      m.manufacturerCountry,
      row.cashFlowShippingMode,
    );
    const payYmd = computePaymentDueYmd(depYmd);
    if (!payYmd || !/^\d{4}-\d{2}-\d{2}$/.test(payYmd)) continue;
    out.push({
      rowId: row.id,
      sku: row.sku.trim() || "—",
      destinationLabel: forecastDestinationDisplay(row.destination, language, destinationOptions),
      totalUsd,
      paymentDueYmd: payYmd,
    });
  }
  return out;
}

/**
 * Stacked payment amounts by calendar month (payment due date), one stack segment per forecast row.
 * `monthKeys` should be e.g. `paymentMonthWindowAroundToday(6, 6)`.
 */
export function buildLandedCostPaymentBarData(
  rows: LandedCostBarRowInput[],
  monthKeys: string[],
  monthLabelFn: (monthKey: string) => string,
): {
  chartData: Record<string, string | number>[];
  seriesOrder: string[];
  seriesMeta: Record<string, LandedCostBarSeriesMeta>;
} {
  const monthSet = new Set(monthKeys);
  const eligible = rows.filter(
    (r) => monthSet.has(r.paymentDueYmd.slice(0, 7)) && Number.isFinite(r.totalUsd) && r.totalUsd > 0,
  );
  eligible.sort((a, b) => {
    const s = a.sku.localeCompare(b.sku);
    if (s !== 0) return s;
    const d = a.destinationLabel.localeCompare(b.destinationLabel);
    if (d !== 0) return d;
    return a.rowId.localeCompare(b.rowId);
  });

  const seriesMeta: Record<string, LandedCostBarSeriesMeta> = {};
  for (const r of eligible) {
    const stackKey = landedCostStackKey(r.rowId);
    seriesMeta[stackKey] = {
      sku: r.sku,
      destinationLabel: r.destinationLabel,
      paymentDueYmd: r.paymentDueYmd,
      totalUsd: r.totalUsd,
      stackKey,
    };
  }

  const payMonth = (r: LandedCostBarRowInput) => r.paymentDueYmd.slice(0, 7);

  const chartData = monthKeys.map((mk) => {
    const row: Record<string, string | number> = {
      monthKey: mk,
      name: monthLabelFn(mk),
    };
    let sum = 0;
    for (const r of eligible) {
      const k = landedCostStackKey(r.rowId);
      const v = payMonth(r) === mk ? r.totalUsd : 0;
      const rounded = Math.round(v * 100) / 100;
      row[k] = rounded;
      sum += v;
    }
    row.monthTotal = Math.round(sum * 100) / 100;
    return row;
  });

  const seriesOrder = eligible.map((r) => landedCostStackKey(r.rowId));
  return { chartData, seriesOrder, seriesMeta };
}
