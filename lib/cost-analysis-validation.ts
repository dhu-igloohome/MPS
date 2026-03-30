import type { CostFreightMode } from "@/lib/types";

/** 宽松校验：金额与 Excel 手算可能存在取整差异，只做范围与枚举检查 */

export function validateCostAnalysisRow(input: {
  quantity: number;
  tariffPct: number;
  freightMode: CostFreightMode;
}): { ok: true } | { ok: false; message: string } {
  if (Number.isNaN(input.quantity) || input.quantity < 0) {
    return { ok: false, message: "订单数量须为不小于 0 的整数。" };
  }
  if (Number.isNaN(input.tariffPct) || input.tariffPct < 0 || input.tariffPct > 100) {
    return { ok: false, message: "tariff 须在 0～100% 之间。" };
  }
  if (input.freightMode !== "air" && input.freightMode !== "sea") {
    return { ok: false, message: "运输方式须为 air（空运）或 sea（海运）。" };
  }
  return { ok: true };
}

/** 提示用：数量 × 单价类是否与订单全额接近（不用于拦截保存） */
export function suggestCheckTotalVsQtyUnit(
  quantity: number,
  unitAmount: number,
  orderTotal: number,
): { close: boolean; diff: number } {
  if (quantity <= 0 || Number.isNaN(unitAmount) || Number.isNaN(orderTotal)) {
    return { close: true, diff: 0 };
  }
  const expected = quantity * unitAmount;
  const diff = Math.abs(expected - orderTotal);
  const tol = Math.max(1, Math.abs(orderTotal) * 0.02);
  return { close: diff <= tol, diff };
}
