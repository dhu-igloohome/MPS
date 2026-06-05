import { monthKeysBetween } from "@/lib/cash-flow-dashboard-agg";
import { forecastLineTotalUsd } from "@/lib/contract-forecast-coverage";
import {
  formatScheduleDateEnglish,
  resolveForecastRowPayment,
} from "@/lib/forecast-supplier-payment-schedule";
import type { ForecastCashFlowRow, SupplierEntry } from "@/lib/types";

export type PaymentScheduleMatrixRow = {
  id: string;
  supplierName: string;
  sku: string;
  forecastMonth: string;
  buildToOrder: number;
  buildToStock: number;
  poIssueDate: string | null;
  lineTotalUsd: number | null;
  depositByMonth: Record<string, number>;
  balanceByMonth: Record<string, number>;
  ready: boolean;
};

export type PaymentScheduleMatrixTotals = {
  lineTotalUsd: number;
  depositByMonth: Record<string, number>;
  balanceByMonth: Record<string, number>;
};

export type PaymentScheduleMatrix = {
  monthKeys: string[];
  rows: PaymentScheduleMatrixRow[];
  totals: PaymentScheduleMatrixTotals;
};

function ymdToMonthKey(ymd: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return ymd.slice(0, 7);
}

/** Unified table month columns (B): earliest payment due month → latest payment due month in scope. */
export function paymentDueMonthKeysForRows(
  rows: ForecastCashFlowRow[],
  suppliers: Pick<SupplierEntry, "name" | "paymentTerms" | "leadTimeDays">[],
): string[] {
  let minMk: string | null = null;
  let maxMk: string | null = null;

  for (const row of rows) {
    const { schedule } = resolveForecastRowPayment(row, suppliers);
    for (const leg of [schedule?.deposit, schedule?.balance]) {
      if (!leg) continue;
      const mk = ymdToMonthKey(leg.dateYmd);
      if (!mk) continue;
      if (!minMk || mk < minMk) minMk = mk;
      if (!maxMk || mk > maxMk) maxMk = mk;
    }
  }

  if (!minMk || !maxMk) return [];
  return monthKeysBetween(`${minMk}-01`, `${maxMk}-01`);
}

function emptyMonthMap(monthKeys: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const mk of monthKeys) out[mk] = 0;
  return out;
}

export function buildPaymentScheduleMatrix(
  rows: ForecastCashFlowRow[],
  suppliers: Pick<SupplierEntry, "name" | "paymentTerms" | "leadTimeDays">[],
): PaymentScheduleMatrix {
  const monthKeys = paymentDueMonthKeysForRows(rows, suppliers);
  const matrixRows: PaymentScheduleMatrixRow[] = [];

  for (const row of rows) {
    const { lineTotal, schedule } = resolveForecastRowPayment(row, suppliers);
    const depositByMonth = emptyMonthMap(monthKeys);
    const balanceByMonth = emptyMonthMap(monthKeys);

    let ready = false;
    if (schedule && !schedule.parseFailed && lineTotal != null) {
      if (schedule.deposit) {
        const mk = ymdToMonthKey(schedule.deposit.dateYmd);
        if (mk && mk in depositByMonth) depositByMonth[mk] = schedule.deposit.amountUsd;
      }
      if (schedule.balance) {
        const mk = ymdToMonthKey(schedule.balance.dateYmd);
        if (mk && mk in balanceByMonth) balanceByMonth[mk] = schedule.balance.amountUsd;
      }
      ready = Boolean(schedule.deposit || schedule.balance);
    }

    matrixRows.push({
      id: row.id,
      supplierName: row.cashFlowSupplierName.trim() || "—",
      sku: row.sku,
      forecastMonth: row.month,
      buildToOrder: Number(row.buildToOrder) || 0,
      buildToStock: Number(row.buildToStock) || 0,
      poIssueDate: row.poIssueDate,
      lineTotalUsd: lineTotal,
      depositByMonth,
      balanceByMonth,
      ready,
    });
  }

  const totals: PaymentScheduleMatrixTotals = {
    lineTotalUsd: 0,
    depositByMonth: emptyMonthMap(monthKeys),
    balanceByMonth: emptyMonthMap(monthKeys),
  };

  for (const r of matrixRows) {
    if (r.lineTotalUsd != null) totals.lineTotalUsd += r.lineTotalUsd;
    for (const mk of monthKeys) {
      totals.depositByMonth[mk] += r.depositByMonth[mk] ?? 0;
      totals.balanceByMonth[mk] += r.balanceByMonth[mk] ?? 0;
    }
  }

  return { monthKeys, rows: matrixRows, totals };
}

export function formatPaymentMonthHeader(monthKey: string, language: "en" | "zh"): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthKey);
  if (!m) return monthKey;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (language === "en") {
    const short = new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short" });
    return `${short}'${String(y).slice(2)}`;
  }
  return `${y}年${mo}月`;
}

export function formatForecastMonthLabel(ym: string, language: "en" | "zh"): string {
  const mk = ym.trim().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(mk)) return ym;
  return formatPaymentMonthHeader(mk, language);
}

export function formatPoIssueDateDisplay(ymd: string | null): string {
  if (!ymd) return "—";
  return formatScheduleDateEnglish(ymd) || ymd;
}

export function uniqueSuppliersFromRows(rows: ForecastCashFlowRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const n = r.cashFlowSupplierName.trim();
    if (n) set.add(n);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function uniqueForecastEntryMonths(rows: ForecastCashFlowRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const m = r.month.trim().slice(0, 7);
    if (/^\d{4}-\d{2}$/.test(m)) set.add(m);
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

export function filterRowsForSupplierReport(
  rows: ForecastCashFlowRow[],
  supplierName: string,
  forecastMonth: string,
): ForecastCashFlowRow[] {
  const sup = supplierName.trim();
  return rows.filter((r) => {
    if (sup && r.cashFlowSupplierName.trim() !== sup) return false;
    if (forecastMonth !== "all") {
      const mk = r.month.trim().slice(0, 7);
      if (mk !== forecastMonth) return false;
    }
    return true;
  });
}

/** Line total for display when schedule not ready (BTO+BTS × unit). */
export function rowLineTotalDisplay(row: ForecastCashFlowRow): number | null {
  return forecastLineTotalUsd(row);
}
