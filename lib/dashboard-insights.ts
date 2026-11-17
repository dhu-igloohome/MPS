import { CONTRACT_OCCUPIED_STATUSES } from "@/lib/contract-forecast-coverage";
import type { ContractEntry, FulfillmentGroup, FulfillmentShipmentEntry, UnitCostQuoteEntry } from "@/lib/types";

function groupKey(month: string, po: string, sku: string): string {
  return `${month.trim().slice(0, 7)}|${po.trim()}|${sku.trim()}`;
}

export type SupplyFunnel = {
  forecast: number;
  contracted: number;
  /** SO quantity of every shipment row (includes "In preparation" — not only goods already on the water). */
  recorded: number;
  /** SO quantity of shipment rows marked Delivered. */
  delivered: number;
};

/**
 * Quantity funnel: forecast → contracted → shipment-recorded → delivered, for the given forecast
 * months. Quantities only (no money). Shipments count only when they belong to one of the groups
 * in scope, so region permissions applied to `groups` also apply to shipments.
 */
export function buildSupplyFunnel(
  groups: FulfillmentGroup[],
  shipments: FulfillmentShipmentEntry[],
  months: ReadonlySet<string>,
): SupplyFunnel {
  const inScope = new Set<string>();
  const out: SupplyFunnel = { forecast: 0, contracted: 0, recorded: 0, delivered: 0 };
  for (const g of groups) {
    if (!months.has(g.forecastMonth.slice(0, 7))) continue;
    inScope.add(groupKey(g.forecastMonth, g.forecastPoNumber, g.sku));
    out.forecast += g.forecastQty;
    out.contracted += g.contractedQty;
  }
  for (const s of shipments) {
    if (!inScope.has(groupKey(s.forecastMonth, s.forecastPoNumber, s.sku))) continue;
    const q = Number.isFinite(s.soQuantity) && s.soQuantity > 0 ? Math.trunc(s.soQuantity) : 0;
    out.recorded += q;
    if (s.deliveryStatus === "Delivered") out.delivered += q;
  }
  return out;
}

export type UnitCostTrendSku = { sku: string; quoteCount: number };

/** SKUs with at least two quotes (a trend needs two points), most-quoted first. */
export function trendableSkus(quotes: UnitCostQuoteEntry[]): UnitCostTrendSku[] {
  const counts = new Map<string, number>();
  for (const q of quotes) counts.set(q.sku, (counts.get(q.sku) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .map(([sku, quoteCount]) => ({ sku, quoteCount }))
    .sort((a, b) => b.quoteCount - a.quoteCount || a.sku.localeCompare(b.sku));
}

export type UnitCostTrend = {
  suppliers: string[];
  /** One row per quote date; a supplier's key is absent when it has no quote on that date. */
  rows: Array<Record<string, number | string>>;
};

/** USD unit price over time for one SKU, one series per supplier. */
export function buildUnitCostTrend(quotes: UnitCostQuoteEntry[], sku: string): UnitCostTrend {
  const mine = quotes.filter((q) => q.sku === sku && Number.isFinite(q.unitPrice) && q.unitPrice > 0);
  const suppliers = [...new Set(mine.map((q) => q.supplierName.trim() || "—"))].sort();
  const byDate = new Map<string, Record<string, number | string>>();
  // Oldest first so that when a supplier has two quotes on one date, the later-listed one wins.
  for (const q of [...mine].sort((a, b) => a.quoteDate.localeCompare(b.quoteDate) || a.createdAt.localeCompare(b.createdAt))) {
    const date = q.quoteDate.slice(0, 10);
    const row = byDate.get(date) ?? { date };
    row[q.supplierName.trim() || "—"] = q.unitPrice;
    byDate.set(date, row);
  }
  return { suppliers, rows: [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date))) };
}

export type SupplierShare = { name: string; quantity: number; contracts: number; pct: number };

/**
 * Contracted quantity per supplier (approved/sent contracts only — same statuses as Order
 * fulfillments), largest first. Suppliers beyond `limit` are merged into one "other" row.
 */
export function buildSupplierConcentration(
  contracts: ContractEntry[],
  limit: number,
  otherLabel: string,
): { rows: SupplierShare[]; total: number } {
  const map = new Map<string, { quantity: number; contracts: number }>();
  let total = 0;
  for (const c of contracts) {
    if (!CONTRACT_OCCUPIED_STATUSES.includes(c.status)) continue;
    const q = Number.isFinite(c.quantity) && c.quantity > 0 ? Math.trunc(c.quantity) : 0;
    if (q === 0) continue;
    const name = c.supplierName.trim() || "—";
    const cur = map.get(name) ?? { quantity: 0, contracts: 0 };
    cur.quantity += q;
    cur.contracts += 1;
    map.set(name, cur);
    total += q;
  }
  const sorted = [...map.entries()]
    .map(([name, v]) => ({ name, ...v, pct: total > 0 ? (v.quantity / total) * 100 : 0 }))
    .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name));
  if (sorted.length <= limit) return { rows: sorted, total };
  const head = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  const restQty = rest.reduce((s, r) => s + r.quantity, 0);
  head.push({
    name: `${otherLabel} (${rest.length})`,
    quantity: restQty,
    contracts: rest.reduce((s, r) => s + r.contracts, 0),
    pct: total > 0 ? (restQty / total) * 100 : 0,
  });
  return { rows: head, total };
}
