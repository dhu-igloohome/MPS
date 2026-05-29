import type { SupplierEntry } from "@/lib/types";

export type SupplierTermsMeta = {
  paymentTerms: string;
  leadTimeDays: number;
  canonicalName: string;
};

/** Normalize supplier names for case/space/full-width tolerant lookup. */
export function normalizeSupplierLookupKey(name: string): string {
  return name
    .trim()
    .normalize("NFKC")
    .replace(/[（(]/g, "(")
    .replace(/[）)]/g, ")")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** Aggressive key for fuzzy supplier match (Co., Ltd vs Co Ltd, etc.). */
export function supplierLookupStrippedKey(name: string): string {
  return normalizeSupplierLookupKey(name).replace(/[\s().,，、·\-_]/g, "");
}

export function buildSupplierTermsIndex(
  suppliers: Pick<SupplierEntry, "name" | "paymentTerms" | "leadTimeDays">[],
): Map<string, SupplierTermsMeta> {
  const m = new Map<string, SupplierTermsMeta>();
  for (const s of suppliers) {
    const k = normalizeSupplierLookupKey(s.name);
    if (!k) continue;
    m.set(k, {
      paymentTerms: s.paymentTerms || "",
      leadTimeDays: s.leadTimeDays ?? 0,
      canonicalName: s.name,
    });
  }
  return m;
}

/**
 * Resolve supplier payment terms + lead time from master data.
 * Tries exact normalized name, then punctuation-stripped unique match.
 */
export function lookupSupplierTerms(
  index: Map<string, SupplierTermsMeta>,
  supplierName: string,
): SupplierTermsMeta | undefined {
  const k = normalizeSupplierLookupKey(supplierName);
  if (!k) return undefined;

  const direct = index.get(k);
  if (direct) return direct;

  const stripped = supplierLookupStrippedKey(supplierName);
  if (!stripped) return undefined;

  let found: SupplierTermsMeta | undefined;
  for (const [key, meta] of index) {
    if (supplierLookupStrippedKey(key) !== stripped) continue;
    if (found) return undefined;
    found = meta;
  }
  return found;
}

/**
 * Whether a quotation/history row supplier matches a filter value (case/space/punctuation tolerant; substring fallback).
 */
export function supplierNamesFuzzyMatch(rowSupplier: string, filterSupplier: string): boolean {
  const b = normalizeSupplierLookupKey(filterSupplier);
  if (!b) return true;
  const a = normalizeSupplierLookupKey(rowSupplier);
  if (!a) return false;
  if (a === b) return true;
  const sa = supplierLookupStrippedKey(rowSupplier);
  const sb = supplierLookupStrippedKey(filterSupplier);
  if (sa === sb) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (sa.includes(sb) || sb.includes(sa)) return true;
  return false;
}
