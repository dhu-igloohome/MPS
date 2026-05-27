import type { UnitCostQuoteEntry } from "@/lib/types";
import { normalizeSupplierLookupKey, supplierLookupStrippedKey } from "@/lib/supplier-name-lookup";

/** Map key for latest unit-cost quote by SKU + supplier (tolerant). */
export function skuSupplierQuoteKey(sku: string, supplierName: string): string {
  return `${sku.trim().toLowerCase()}::${normalizeSupplierLookupKey(supplierName)}`;
}

export function buildSkuSupplierToLatestQuoteMap(
  quotes: UnitCostQuoteEntry[],
): Map<string, UnitCostQuoteEntry> {
  const m = new Map<string, UnitCostQuoteEntry>();
  for (const q of quotes) {
    const k = skuSupplierQuoteKey(q.sku, q.supplierName);
    if (!m.has(k)) m.set(k, q);
  }
  return m;
}

/** In-memory lookup after quotes are loaded (same rules as DB resolver). */
export function findLatestUnitCostQuoteInMap(
  map: Map<string, UnitCostQuoteEntry>,
  sku: string,
  supplierName: string,
): UnitCostQuoteEntry | null {
  const sk = sku.trim();
  const sup = supplierName.trim();
  if (!sk || !sup) return null;

  const direct = map.get(skuSupplierQuoteKey(sk, sup));
  if (direct) return direct;

  const target = supplierLookupStrippedKey(sup);
  if (!target) return null;

  let found: UnitCostQuoteEntry | undefined;
  for (const [key, q] of map) {
    if (!key.startsWith(`${sk.toLowerCase()}::`)) continue;
    if (supplierLookupStrippedKey(q.supplierName) !== target) continue;
    if (found) return null;
    found = q;
  }
  return found ?? null;
}
