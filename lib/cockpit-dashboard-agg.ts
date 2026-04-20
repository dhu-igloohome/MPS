import { monthKeysBetween, paymentMonthWindowAroundToday, type RangePreset } from "@/lib/cash-flow-dashboard-agg";
import type {
  ForecastEntry,
  LogisticsShipmentEntry,
  OrderProgressEntry,
  OrderProgressStatus,
} from "@/lib/types";

/** Forecast 筛选：month 字段为 YYYY-MM */
export type ForecastCockpitFilters = {
  region: string;
  destination: string;
  productName: string;
};

export function filterForecastByDims(entries: ForecastEntry[], f: ForecastCockpitFilters): ForecastEntry[] {
  return entries.filter((e) => {
    if (f.region && e.region !== f.region) return false;
    if (f.destination && e.destination !== f.destination) return false;
    if (f.productName && e.productName !== f.productName) return false;
    return true;
  });
}

export function filterForecastByMonthRange(entries: ForecastEntry[], monthFrom: string, monthTo: string): ForecastEntry[] {
  return entries.filter((e) => e.month >= monthFrom && e.month <= monthTo);
}

export type ForecastChartPoint = {
  key: string;
  label: string;
  bto: number;
  bts: number;
  total: number;
  rowCount: number;
};

export function buildForecastMonthlySeries(entries: ForecastEntry[], monthKeys: string[]): ForecastChartPoint[] {
  return monthKeys.map((mk) => {
    const rows = entries.filter((e) => e.month === mk);
    const bto = rows.reduce((s, e) => s + e.buildToOrder, 0);
    const bts = rows.reduce((s, e) => s + e.buildToStock, 0);
    return { key: mk, label: mk, bto, bts, total: bto + bts, rowCount: rows.length };
  });
}

export function aggregateForecastQuarters(points: ForecastChartPoint[]): ForecastChartPoint[] {
  const map = new Map<string, ForecastChartPoint>();
  for (const p of points) {
    const [y, mo] = p.key.split("-").map(Number);
    const q = Math.ceil(mo / 3);
    const qk = `${y}-Q${q}`;
    const cur = map.get(qk) ?? { key: qk, label: qk, bto: 0, bts: 0, total: 0, rowCount: 0 };
    cur.bto += p.bto;
    cur.bts += p.bts;
    cur.total += p.total;
    cur.rowCount += p.rowCount;
    map.set(qk, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function forecastKpis(entries: ForecastEntry[]) {
  const bto = entries.reduce((s, e) => s + e.buildToOrder, 0);
  const bts = entries.reduce((s, e) => s + e.buildToStock, 0);
  const sku = new Set(entries.map((e) => e.sku)).size;
  return { bto, bts, total: bto + bts, skuCount: sku, rowCount: entries.length };
}

export function drillForecastForMonth(entries: ForecastEntry[], monthKey: string): ForecastEntry[] {
  return entries.filter((e) => e.month === monthKey);
}

export function drillForecastForQuarter(entries: ForecastEntry[], quarterKey: string): ForecastEntry[] {
  const m = quarterKey.match(/^(\d{4})-Q([1-4])$/);
  if (!m) return [];
  const y = m[1];
  const q = Number(m[2]);
  const startM = (q - 1) * 3 + 1;
  const endM = startM + 2;
  return entries.filter((e) => {
    const ey = e.month.slice(0, 4);
    const mo = Number(e.month.slice(5, 7));
    return ey === y && mo >= startM && mo <= endM;
  });
}

/** Order progress */
export type OrderCockpitFilters = {
  region: string;
  factory: string;
  progress: string;
};

export function filterOrderProgress(entries: OrderProgressEntry[], f: OrderCockpitFilters): OrderProgressEntry[] {
  return entries.filter((e) => {
    if (f.region && e.region !== f.region) return false;
    if (f.factory && e.factoryName !== f.factory) return false;
    if (f.progress && e.progress !== f.progress) return false;
    return true;
  });
}

export function filterOrderByDateRange(entries: OrderProgressEntry[], dateFrom: string, dateTo: string): OrderProgressEntry[] {
  return entries.filter((e) => e.orderDate >= dateFrom && e.orderDate <= dateTo);
}

export type OrderChartPoint = {
  key: string;
  label: string;
  count: number;
  qty: number;
  not_started: number;
  in_production: number;
  ready_to_ship: number;
};

export function buildOrderMonthlySeries(entries: OrderProgressEntry[], monthKeys: string[]): OrderChartPoint[] {
  return monthKeys.map((mk) => {
    const rows = entries.filter((e) => e.orderDate.startsWith(mk));
    const not_started = rows.filter((r) => r.progress === "not_started").length;
    const in_production = rows.filter((r) => r.progress === "in_production").length;
    const ready_to_ship = rows.filter((r) => r.progress === "ready_to_ship").length;
    const qty = rows.reduce((s, r) => s + r.quantity, 0);
    return {
      key: mk,
      label: mk,
      count: rows.length,
      qty,
      not_started,
      in_production,
      ready_to_ship,
    };
  });
}

export function aggregateOrderQuarters(points: OrderChartPoint[]): OrderChartPoint[] {
  const map = new Map<string, OrderChartPoint>();
  for (const p of points) {
    const [y, mo] = p.key.split("-").map(Number);
    const q = Math.ceil(mo / 3);
    const qk = `${y}-Q${q}`;
    const cur = map.get(qk) ?? {
      key: qk,
      label: qk,
      count: 0,
      qty: 0,
      not_started: 0,
      in_production: 0,
      ready_to_ship: 0,
    };
    cur.count += p.count;
    cur.qty += p.qty;
    cur.not_started += p.not_started;
    cur.in_production += p.in_production;
    cur.ready_to_ship += p.ready_to_ship;
    map.set(qk, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function orderKpis(entries: OrderProgressEntry[]) {
  const by: Record<OrderProgressStatus, number> = {
    not_started: 0,
    in_production: 0,
    ready_to_ship: 0,
  };
  for (const e of entries) {
    by[e.progress]++;
  }
  const qty = entries.reduce((s, e) => s + e.quantity, 0);
  return { total: entries.length, qty, ...by };
}

export function drillOrdersForMonth(entries: OrderProgressEntry[], monthKey: string): OrderProgressEntry[] {
  return entries.filter((e) => e.orderDate.startsWith(monthKey));
}

export function drillOrdersForQuarterOp(entries: OrderProgressEntry[], quarterKey: string): OrderProgressEntry[] {
  const m = quarterKey.match(/^(\d{4})-Q([1-4])$/);
  if (!m) return [];
  const y = m[1];
  const q = Number(m[2]);
  const startM = (q - 1) * 3 + 1;
  const endM = startM + 2;
  return entries.filter((e) => {
    const ey = e.orderDate.slice(0, 4);
    const mo = Number(e.orderDate.slice(5, 7));
    return ey === y && mo >= startM && mo <= endM;
  });
}

/** Logistics */
export type LogisticsCockpitFilters = {
  status: string;
  movementType: string;
  fromLocation: string;
  toLocation: string;
};

export function logisticsDateOnly(createdAt: string): string {
  return createdAt.slice(0, 10);
}

export function filterLogistics(entries: LogisticsShipmentEntry[], f: LogisticsCockpitFilters): LogisticsShipmentEntry[] {
  return entries.filter((e) => {
    if (f.status && e.status !== f.status) return false;
    if (f.movementType && e.movementType !== f.movementType) return false;
    if (f.fromLocation && e.fromLocation !== f.fromLocation) return false;
    if (f.toLocation && e.toLocation !== f.toLocation) return false;
    return true;
  });
}

export function filterLogisticsByDateRange(entries: LogisticsShipmentEntry[], dateFrom: string, dateTo: string): LogisticsShipmentEntry[] {
  return entries.filter((e) => {
    const d = logisticsDateOnly(e.createdAt);
    return d >= dateFrom && d <= dateTo;
  });
}

export type LogisticsChartPoint = {
  key: string;
  label: string;
  count: number;
  qty: number;
  not_shipped: number;
  in_transit: number;
  delivered: number;
  cancelled: number;
};

export function buildLogisticsMonthlySeries(entries: LogisticsShipmentEntry[], monthKeys: string[]): LogisticsChartPoint[] {
  return monthKeys.map((mk) => {
    const rows = entries.filter((e) => e.createdAt.slice(0, 7) === mk);
    const not_shipped = rows.filter((r) => r.status === "not_shipped").length;
    const in_transit = rows.filter((r) => r.status === "in_transit").length;
    const delivered = rows.filter((r) => r.status === "delivered").length;
    const cancelled = rows.filter((r) => r.status === "cancelled").length;
    const qty = rows.reduce((s, r) => s + r.quantity, 0);
    return {
      key: mk,
      label: mk,
      count: rows.length,
      qty,
      not_shipped,
      in_transit,
      delivered,
      cancelled,
    };
  });
}

export function aggregateLogisticsQuarters(points: LogisticsChartPoint[]): LogisticsChartPoint[] {
  const map = new Map<string, LogisticsChartPoint>();
  for (const p of points) {
    const [y, mo] = p.key.split("-").map(Number);
    const q = Math.ceil(mo / 3);
    const qk = `${y}-Q${q}`;
    const cur = map.get(qk) ?? {
      key: qk,
      label: qk,
      count: 0,
      qty: 0,
      not_shipped: 0,
      in_transit: 0,
      delivered: 0,
      cancelled: 0,
    };
    cur.count += p.count;
    cur.qty += p.qty;
    cur.not_shipped += p.not_shipped;
    cur.in_transit += p.in_transit;
    cur.delivered += p.delivered;
    cur.cancelled += p.cancelled;
    map.set(qk, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
}

export function logisticsKpis(entries: LogisticsShipmentEntry[]) {
  let not_shipped = 0;
  let in_transit = 0;
  let delivered = 0;
  let cancelled = 0;
  for (const e of entries) {
    if (e.status === "not_shipped") not_shipped++;
    else if (e.status === "in_transit") in_transit++;
    else if (e.status === "delivered") delivered++;
    else if (e.status === "cancelled") cancelled++;
  }
  const qty = entries.reduce((s, e) => s + e.quantity, 0);
  return { total: entries.length, qty, not_shipped, in_transit, delivered, cancelled };
}

export function drillLogisticsForMonth(entries: LogisticsShipmentEntry[], monthKey: string): LogisticsShipmentEntry[] {
  return entries.filter((e) => e.createdAt.slice(0, 7) === monthKey);
}

export function drillLogisticsForQuarter(entries: LogisticsShipmentEntry[], quarterKey: string): LogisticsShipmentEntry[] {
  const m = quarterKey.match(/^(\d{4})-Q([1-4])$/);
  if (!m) return [];
  const y = m[1];
  const q = Number(m[2]);
  const startM = (q - 1) * 3 + 1;
  const endM = startM + 2;
  return entries.filter((e) => {
    const mk = e.createdAt.slice(0, 7);
    const ey = mk.slice(0, 4);
    const mo = Number(mk.slice(5, 7));
    return ey === y && mo >= startM && mo <= endM;
  });
}

export function monthKeysForForecastRange(monthFrom: string, monthTo: string): string[] {
  return monthKeysBetween(`${monthFrom}-01`, `${monthTo}-01`);
}

/** 含「全部记录」：按数据中最早/最晚 forecast month。 */
export type ForecastRangePreset = RangePreset | "all";

function forecastMonthSpanFromEntries(entries: ForecastEntry[]): { from: string; to: string } {
  if (entries.length === 0) {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const m = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
    return { from: m, to: m };
  }
  let min = entries[0].month;
  let max = entries[0].month;
  for (const e of entries) {
    if (e.month < min) min = e.month;
    if (e.month > max) max = e.month;
  }
  return { from: min, to: max };
}

/** 按区域汇总 BTO+BTS（用于饼图等） */
export function aggregateForecastByRegion(entries: ForecastEntry[]) {
  const map = new Map<string, { bto: number; bts: number }>();
  for (const e of entries) {
    const cur = map.get(e.region) ?? { bto: 0, bts: 0 };
    cur.bto += e.buildToOrder;
    cur.bts += e.buildToStock;
    map.set(e.region, cur);
  }
  return Array.from(map.entries())
    .map(([region, v]) => ({
      region,
      name: region,
      value: v.bto + v.bts,
      bto: v.bto,
      bts: v.bts,
    }))
    .sort((a, b) => b.value - a.value);
}

/** 按产品汇总，取 Top N */
export function aggregateForecastTopProducts(entries: ForecastEntry[], limit: number) {
  const map = new Map<string, { bto: number; bts: number }>();
  for (const e of entries) {
    const key = e.productName?.trim() || "—";
    const cur = map.get(key) ?? { bto: 0, bts: 0 };
    cur.bto += e.buildToOrder;
    cur.bts += e.buildToStock;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .map(([name, v]) => {
      const short = name.length > 36 ? `${name.slice(0, 34)}…` : name;
      return {
        name: short,
        fullName: name,
        total: v.bto + v.bts,
        bto: v.bto,
        bts: v.bts,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

/** Forecast 使用 YYYY-MM 区间（与订单日历月一致） */
export function getForecastMonthRangePreset(
  preset: ForecastRangePreset,
  customMonthFrom: string,
  customMonthTo: string,
  allEntries?: ForecastEntry[],
): { from: string; to: string } {
  if (preset === "all") {
    return forecastMonthSpanFromEntries(allEntries ?? []);
  }
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const toM = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  if (preset === "custom" && customMonthFrom && customMonthTo && customMonthFrom <= customMonthTo) {
    return { from: customMonthFrom.slice(0, 7), to: customMonthTo.slice(0, 7) };
  }
  if (preset === "ytd") {
    return { from: `${today.getFullYear()}-01`, to: toM };
  }
  if (preset === "pm3") {
    const months = paymentMonthWindowAroundToday(3, 3);
    if (months.length === 0) return { from: "", to: "" };
    return { from: months[0], to: months[months.length - 1] };
  }
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  d.setUTCMonth(d.getUTCMonth() - 11);
  const fromM = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
  return { from: fromM, to: toM };
}

export type { RangePreset };
