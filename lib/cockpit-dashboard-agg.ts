import type { ForecastEntry } from "@/lib/types";

export function forecastKpis(entries: ForecastEntry[]) {
  const bto = entries.reduce((s, e) => s + e.buildToOrder, 0);
  const bts = entries.reduce((s, e) => s + e.buildToStock, 0);
  const sku = new Set(entries.map((e) => e.sku)).size;
  return { bto, bts, total: bto + bts, skuCount: sku, rowCount: entries.length };
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
