import type { CostAnalysisEntry } from "@/lib/types";

/** 单价与成本分析「unit cost（含 tariff）」比对容差 */
const UNIT_PRICE_EPS = 0.02;

export function findCostAnalysisForCashFlow(
  entries: CostAnalysisEntry[],
  orderNumber: string,
  sku: string,
): CostAnalysisEntry | undefined {
  const on = orderNumber.trim();
  const sk = sku.trim();
  if (!on || !sk) return undefined;
  return entries.find((e) => e.orderNumber.trim() === on && e.sku.trim() === sk);
}

export function findCostAnalysisById(entries: CostAnalysisEntry[], id: string): CostAnalysisEntry | undefined {
  const t = id.trim();
  if (!t) return undefined;
  return entries.find((e) => e.id === t);
}

/**
 * 现金流订单号 + SKU + 单价须与成本分析某行一致（单价 = unit cost 含 tariff）。
 */
export function validateCashFlowAgainstCostAnalysis(
  orderNumber: string,
  sku: string,
  unitPrice: number,
  costEntries: CostAnalysisEntry[],
): { ok: true; costRow: CostAnalysisEntry } | { ok: false; message: string } {
  const row = findCostAnalysisForCashFlow(costEntries, orderNumber, sku);
  if (!row) {
    return {
      ok: false,
      message:
        "订单号与 SKU 须在成本分析中存在且一致。Order number and SKU must match a row in Cost analysis.",
    };
  }
  if (Math.abs(unitPrice - row.unitCostWithTariff) > UNIT_PRICE_EPS) {
    return {
      ok: false,
      message:
        "单价须与成本分析该行「unit cost（含 tariff）」一致。Unit price must match that row's unit cost (incl. tariff) in Cost analysis.",
    };
  }
  return { ok: true, costRow: row };
}
