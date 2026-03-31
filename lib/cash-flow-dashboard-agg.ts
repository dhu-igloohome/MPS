import { findCostAnalysisForCashFlow } from "@/lib/cash-flow-cost-analysis-link";
import type { CashFlowEntry, CostAnalysisEntry } from "@/lib/types";

export type EnrichedCashFlow = CashFlowEntry & {
  supplier: string;
};

export function enrichCashFlowRows(entries: CashFlowEntry[], costRows: CostAnalysisEntry[]): EnrichedCashFlow[] {
  return entries.map((e) => {
    const ca = findCostAnalysisForCashFlow(costRows, e.orderNumber, e.sku);
    return {
      ...e,
      supplier: ca?.supplierName?.trim() || "—",
    };
  });
}

export type DashboardFilters = {
  supplier: string;
  qtyMin: number | null;
  qtyMax: number | null;
  totalMin: number | null;
  totalMax: number | null;
  advMin: number | null;
  advMax: number | null;
  finMin: number | null;
  finMax: number | null;
};

export function sumActualPaid(e: CashFlowEntry): number {
  return (e.actualAdvanceAmount ?? 0) + (e.actualFinalAmount ?? 0);
}

export function filterEnriched(
  rows: EnrichedCashFlow[],
  f: DashboardFilters,
  dateFrom: string,
  dateTo: string,
): EnrichedCashFlow[] {
  return rows.filter((e) => {
    if (e.orderDate < dateFrom || e.orderDate > dateTo) return false;
    if (f.supplier && e.supplier !== f.supplier) return false;
    if (f.qtyMin != null && Number.isFinite(f.qtyMin) && e.quantity < f.qtyMin) return false;
    if (f.qtyMax != null && Number.isFinite(f.qtyMax) && e.quantity > f.qtyMax) return false;
    if (f.totalMin != null && Number.isFinite(f.totalMin) && e.totalAmount < f.totalMin) return false;
    if (f.totalMax != null && Number.isFinite(f.totalMax) && e.totalAmount > f.totalMax) return false;
    const adv = e.actualAdvanceAmount ?? 0;
    const fin = e.actualFinalAmount ?? 0;
    if (f.advMin != null && Number.isFinite(f.advMin) && adv < f.advMin) return false;
    if (f.advMax != null && Number.isFinite(f.advMax) && adv > f.advMax) return false;
    if (f.finMin != null && Number.isFinite(f.finMin) && fin < f.finMin) return false;
    if (f.finMax != null && Number.isFinite(f.finMax) && fin > f.finMax) return false;
    return true;
  });
}

export function computeKpis(rows: EnrichedCashFlow[]) {
  const orderTotal = rows.reduce((s, e) => s + e.totalAmount, 0);
  const actualPaid = rows.reduce((s, e) => s + sumActualPaid(e), 0);
  const unpaid = orderTotal - actualPaid;
  const lags: number[] = [];
  for (const e of rows) {
    const orderMs = new Date(`${e.orderDate}T12:00:00Z`).getTime();
    if (e.actualAdvanceDate) {
      const d = new Date(`${e.actualAdvanceDate}T12:00:00Z`).getTime();
      lags.push((d - orderMs) / 86400000);
    }
    if (e.actualFinalDate) {
      const d = new Date(`${e.actualFinalDate}T12:00:00Z`).getTime();
      lags.push((d - orderMs) / 86400000);
    }
  }
  const avgPayDays = lags.length ? lags.reduce((a, b) => a + b, 0) / lags.length : null;
  return { orderTotal, actualPaid, unpaid, avgPayDays };
}

export type PeriodGrain = "month" | "quarter";

export type ChartPoint = {
  label: string;
  key: string;
  orderTotalInPeriod: number;
  actualPaidInPeriod: number;
  advancePaidInPeriod: number;
  finalPaidInPeriod: number;
};

export function monthKeysBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  const y = Number(from.slice(0, 4));
  const m = Number(from.slice(5, 7));
  const endY = Number(to.slice(0, 4));
  const endM = Number(to.slice(5, 7));
  let cy = y;
  let cm = m;
  while (cy < endY || (cy === endY && cm <= endM)) {
    keys.push(`${cy}-${String(cm).padStart(2, "0")}`);
    cm += 1;
    if (cm > 12) {
      cm = 1;
      cy += 1;
    }
  }
  return keys;
}

/** Inclusive month keys from `monthsBack` before the current calendar month through `monthsForward` after it (for payment-month charts). */
export function paymentMonthWindowAroundToday(monthsBack: number, monthsForward: number): string[] {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const idx = y * 12 + (m - 1);
  const startIdx = idx - monthsBack;
  const endIdx = idx + monthsForward;
  const sy = Math.floor(startIdx / 12);
  const sm = (startIdx % 12) + 1;
  const ey = Math.floor(endIdx / 12);
  const em = (endIdx % 12) + 1;
  const fromStr = `${sy}-${String(sm).padStart(2, "0")}-01`;
  const toStr = `${ey}-${String(em).padStart(2, "0")}-01`;
  return monthKeysBetween(fromStr, toStr);
}

/** Inclusive YYYY-MM-DD range covering the same months as `paymentMonthWindowAroundToday` (first day of first month → last day of last month). */
export function dateRangeForMonthWindowAroundToday(monthsBack: number, monthsForward: number): { from: string; to: string } {
  const months = paymentMonthWindowAroundToday(monthsBack, monthsForward);
  if (months.length === 0) return { from: "", to: "" };
  const first = months[0];
  const last = months[months.length - 1];
  const y = Number(last.slice(0, 4));
  const m = Number(last.slice(5, 7));
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${first}-01`, to: `${last}-${String(lastDay).padStart(2, "0")}` };
}

export function buildMonthlyChartSeries(rows: EnrichedCashFlow[], monthKeys: string[]): ChartPoint[] {
  return monthKeys.map((mk) => {
    let orderTotalInPeriod = 0;
    let advancePaidInPeriod = 0;
    let finalPaidInPeriod = 0;
    for (const e of rows) {
      if (e.orderDate.startsWith(mk)) orderTotalInPeriod += e.totalAmount;
      if (e.actualAdvanceDate?.startsWith(mk)) advancePaidInPeriod += e.actualAdvanceAmount ?? 0;
      if (e.actualFinalDate?.startsWith(mk)) finalPaidInPeriod += e.actualFinalAmount ?? 0;
    }
    const actualPaidInPeriod = advancePaidInPeriod + finalPaidInPeriod;
    return {
      label: mk,
      key: mk,
      orderTotalInPeriod,
      actualPaidInPeriod,
      advancePaidInPeriod,
      finalPaidInPeriod,
    };
  });
}

export function aggregateToQuarters(points: ChartPoint[]): ChartPoint[] {
  const map = new Map<string, ChartPoint>();
  for (const p of points) {
    const [y, mo] = p.key.split("-");
    const m = Number(mo);
    const q = Math.ceil(m / 3);
    const qk = `${y}-Q${q}`;
    const cur = map.get(qk) ?? {
      label: qk,
      key: qk,
      orderTotalInPeriod: 0,
      actualPaidInPeriod: 0,
      advancePaidInPeriod: 0,
      finalPaidInPeriod: 0,
    };
    cur.orderTotalInPeriod += p.orderTotalInPeriod;
    cur.advancePaidInPeriod += p.advancePaidInPeriod;
    cur.finalPaidInPeriod += p.finalPaidInPeriod;
    cur.actualPaidInPeriod = cur.advancePaidInPeriod + cur.finalPaidInPeriod;
    map.set(qk, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function drillOrdersForOrderMonth(
  rows: EnrichedCashFlow[],
  monthKey: string,
): EnrichedCashFlow[] {
  return rows.filter((e) => e.orderDate.startsWith(monthKey));
}

export function drillOrdersForQuarter(rows: EnrichedCashFlow[], quarterKey: string): EnrichedCashFlow[] {
  const parts = quarterKey.match(/^(\d{4})-Q([1-4])$/);
  if (!parts) return [];
  const y = parts[1];
  const q = Number(parts[2]);
  const startM = (q - 1) * 3 + 1;
  const endM = startM + 2;
  return rows.filter((e) => {
    const ey = e.orderDate.slice(0, 4);
    const m = Number(e.orderDate.slice(5, 7));
    return ey === y && m >= startM && m <= endM;
  });
}

export type RangePreset = "12m" | "ytd" | "custom" | "pm3";

export function getDateRangePreset(preset: RangePreset, customFrom: string, customTo: string): { from: string; to: string } {
  const today = new Date();
  const toStr = today.toISOString().slice(0, 10);
  if (preset === "custom" && customFrom && customTo && customFrom <= customTo) {
    return { from: customFrom, to: customTo };
  }
  if (preset === "ytd") {
    const y = today.getFullYear();
    return { from: `${y}-01-01`, to: toStr };
  }
  if (preset === "pm3") {
    return dateRangeForMonthWindowAroundToday(3, 3);
  }
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - 11);
  return { from: start.toISOString().slice(0, 10), to: toStr };
}
