import type { CashFlowEntry, OrderProgressEntry, Region, SessionPayload } from "@/lib/types";

export type SkuCashMeta = {
  region: string;
  supplier: string;
};

/** 从订单进度构建 SKU → 地区、工厂/供应商（按 updated 优先，查询已 desc） */
export function buildSkuCashMetaFromOrderProgress(rows: OrderProgressEntry[]): Map<string, SkuCashMeta> {
  const map = new Map<string, SkuCashMeta>();
  for (const row of rows) {
    const sku = row.sku.trim();
    if (!sku || map.has(sku)) continue;
    const region = row.region === "US" ? "USA" : row.region;
    map.set(sku, {
      region,
      supplier: row.factoryName?.trim() || "—",
    });
  }
  return map;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function monthKeyFromIsoDate(iso: string): string {
  return iso.slice(0, 7);
}

export function quarterKeyFromMonthKey(month: string): string {
  const y = month.slice(0, 4);
  const mo = Number(month.slice(5, 7));
  const q = Math.floor((Math.max(1, Math.min(12, mo)) - 1) / 3) + 1;
  return `${y}-Q${q}`;
}

function expectedAdvance(e: CashFlowEntry): number {
  return (e.totalAmount * e.advanceRatioPct) / 100;
}

function expectedFinal(e: CashFlowEntry): number {
  return (e.totalAmount * e.finalRatioPct) / 100;
}

export type CashFlowScheduledSlice = {
  entryId: string;
  sku: string;
  region: string;
  supplier: string;
  /** 预付计入的期间（月或季 key 与 granularity 一致） */
  advancePeriod: string;
  /** 尾款计入的期间 */
  finalPeriod: string;
  advanceAmount: number;
  finalAmount: number;
};

function periodForGranularity(monthKey: string, g: "month" | "quarter"): string {
  return g === "month" ? monthKey : quarterKeyFromMonthKey(monthKey);
}

export function scheduleCashFlowSlices(
  entries: CashFlowEntry[],
  skuMeta: Map<string, SkuCashMeta>,
  granularity: "month" | "quarter",
): CashFlowScheduledSlice[] {
  const out: CashFlowScheduledSlice[] = [];
  for (const e of entries) {
    const sku = e.sku.trim();
    const meta = skuMeta.get(sku);
    const region = meta?.region ?? "未关联";
    const supplier = meta?.supplier ?? "—";
    const orderMonth = monthKeyFromIsoDate(e.orderDate);
    const finalDate = addCalendarDays(e.orderDate, e.paymentTermDays);
    const finalMonth = monthKeyFromIsoDate(finalDate);
    const adv = expectedAdvance(e);
    const fin = expectedFinal(e);
    out.push({
      entryId: e.id,
      sku: sku || "—",
      region,
      supplier,
      advancePeriod: periodForGranularity(orderMonth, granularity),
      finalPeriod: periodForGranularity(finalMonth, granularity),
      advanceAmount: adv,
      finalAmount: fin,
    });
  }
  return out;
}

/** 按期间汇总：现金流出 = 该期应付预付 + 该期应付尾款 */
export function aggregateByPeriod(slices: CashFlowScheduledSlice[]): {
  period: string;
  total: number;
  advancePart: number;
  finalPart: number;
  byRegion: Record<string, number>;
}[] {
  const map = new Map<
    string,
    { total: number; advancePart: number; finalPart: number; byRegion: Record<string, number> }
  >();
  function add(
    period: string,
    region: string,
    amount: number,
    kind: "advance" | "final",
  ) {
    const curr = map.get(period) ?? { total: 0, advancePart: 0, finalPart: 0, byRegion: {} };
    curr.total += amount;
    if (kind === "advance") curr.advancePart += amount;
    else curr.finalPart += amount;
    curr.byRegion[region] = (curr.byRegion[region] ?? 0) + amount;
    map.set(period, curr);
  }
  for (const s of slices) {
    add(s.advancePeriod, s.region, s.advanceAmount, "advance");
    add(s.finalPeriod, s.region, s.finalAmount, "final");
  }
  return [...map.entries()]
    .map(([period, v]) => ({ period, ...v }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export type SkuExposure = {
  sku: string;
  region: string;
  supplier: string;
  totalScheduled: number;
};

export function topSkuExposure(slices: CashFlowScheduledSlice[], limit: number): SkuExposure[] {
  const bySku = new Map<string, { region: string; supplier: string; total: number }>();
  for (const s of slices) {
    const curr = bySku.get(s.sku) ?? { region: s.region, supplier: s.supplier, total: 0 };
    curr.total += s.advanceAmount + s.finalAmount;
    bySku.set(s.sku, curr);
  }
  return [...bySku.entries()]
    .map(([sku, v]) => ({ sku, region: v.region, supplier: v.supplier, totalScheduled: v.total }))
    .sort((a, b) => b.totalScheduled - a.totalScheduled)
    .slice(0, limit);
}

export function filterCashFlowForSession(
  entries: CashFlowEntry[],
  skuMeta: Map<string, SkuCashMeta>,
  session: SessionPayload,
): CashFlowEntry[] {
  if (session.role === "super_admin") return entries;
  const allowed = new Set(session.regions);
  return entries.filter((e) => {
    const meta = skuMeta.get(e.sku.trim());
    if (!meta) return false;
    const r = meta.region as Region;
    return allowed.has(r);
  });
}
