import { monthKeysBetween } from "@/lib/cash-flow-dashboard-agg";
import type { ForecastPaySchedule } from "@/lib/forecast-supplier-payment-schedule";

export type FcPaymentBarBucketMode = "dueMonth" | "forecastMonth";

export type FcPaymentBarRowInput = {
  row: { cashFlowSupplierName: string; month: string };
  schedule: ForecastPaySchedule | null;
  lineTotal: number | null;
};

/** Normalize stored forecast_month (YYYY-MM) for chart bucketing. */
export function normalizeForecastMonthKey(raw: string): string | null {
  const s = raw.trim();
  const m = /^(\d{4})-(\d{2})$/.exec(s);
  if (m) return `${m[1]}-${m[2]}`;
  const m2 = /^(\d{4})-(\d{2})-/.exec(s);
  if (m2) return `${m2[1]}-${m2[2]}`;
  return null;
}

/** Distinct YYYY-MM forecast months present in rows (sorted). */
export function uniqueForecastMonthKeysFromRows(rows: { month: string }[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const mk = normalizeForecastMonthKey(r.month);
    if (mk) set.add(mk);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

/** X-axis months spanning all forecast rows (sorted); empty → null. */
export function forecastMonthKeysFromRows(rows: { month: string }[]): string[] | null {
  const set = new Set<string>();
  for (const r of rows) {
    const mk = normalizeForecastMonthKey(r.month);
    if (mk) set.add(mk);
  }
  if (set.size === 0) return null;
  const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
  if (sorted.length === 1) return sorted;
  return monthKeysBetween(`${sorted[0]}-01`, `${sorted[sorted.length - 1]}-01`);
}

/**
 * Bucket deposit / balance due amounts by calendar month (YYYY-MM) and supplier name.
 */
function addTo(
  map: Map<string, Map<string, number>>,
  monthKey: string,
  supplier: string,
  amount: number,
) {
  if (!monthKey || !Number.isFinite(amount) || amount === 0) return;
  let bySup = map.get(monthKey);
  if (!bySup) {
    bySup = new Map();
    map.set(monthKey, bySup);
  }
  const k = supplier.trim() || "—";
  bySup.set(k, (bySup.get(k) ?? 0) + amount);
}

/**
 * Build Recharts-friendly rows for stacked deposit / balance bars (current month ±6).
 */
export function buildForecastCashPaymentBarData(
  items: FcPaymentBarRowInput[],
  monthKeys: string[],
  monthLabelFn: (monthKey: string) => string,
  bucketMode: FcPaymentBarBucketMode = "dueMonth",
): {
  chartData: Record<string, string | number>[];
  suppliers: string[];
} {
  const depositByMonth = new Map<string, Map<string, number>>();
  const balanceByMonth = new Map<string, Map<string, number>>();
  const supplierSet = new Set<string>();

  for (const it of items) {
    const sch = it.schedule;
    if (!sch || sch.parseFailed || it.lineTotal == null) continue;
    const sup = it.row.cashFlowSupplierName.trim() || "—";
    const forecastMk = normalizeForecastMonthKey(it.row.month);

    if (bucketMode === "forecastMonth") {
      if (!forecastMk) continue;
      if (sch.deposit) {
        addTo(depositByMonth, forecastMk, sup, sch.deposit.amountUsd);
        supplierSet.add(sup);
      }
      if (sch.balance) {
        addTo(balanceByMonth, forecastMk, sup, sch.balance.amountUsd);
        supplierSet.add(sup);
      }
      continue;
    }

    if (sch.deposit) {
      const mk = sch.deposit.dateYmd.slice(0, 7);
      addTo(depositByMonth, mk, sup, sch.deposit.amountUsd);
      supplierSet.add(sup);
    }
    if (sch.balance) {
      const mk = sch.balance.dateYmd.slice(0, 7);
      addTo(balanceByMonth, mk, sup, sch.balance.amountUsd);
      supplierSet.add(sup);
    }
  }

  const suppliers = Array.from(supplierSet).sort((a, b) => a.localeCompare(b));

  const chartData = monthKeys.map((mk) => {
    const row: Record<string, string | number> = {
      monthKey: mk,
      name: monthLabelFn(mk),
    };
    const depM = depositByMonth.get(mk);
    const balM = balanceByMonth.get(mk);
    let depSum = 0;
    let balSum = 0;
    suppliers.forEach((s, i) => {
      const dv = depM?.get(s) ?? 0;
      const bv = balM?.get(s) ?? 0;
      row[`d${i}`] = Math.round(dv * 100) / 100;
      row[`b${i}`] = Math.round(bv * 100) / 100;
      depSum += dv;
      balSum += bv;
    });
    row.depositTotal = Math.round(depSum * 100) / 100;
    row.balanceTotal = Math.round(balSum * 100) / 100;
    return row;
  });

  return { chartData, suppliers };
}
