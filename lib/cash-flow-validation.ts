/** Cash flow: 数量×单价=总金额；预付%+尾款%=100%；实际尾款=总金额−实际预付（派生）。单价须与成本分析一致（见 cash-flow-cost-analysis-link）。 */

import { addCalendarDays } from "@/lib/cash-flow-overview";

const MONEY_EPS = 0.02;
const PCT_EPS = 0.05;

/** 下单日起第 7 个自然日为实际预付日；自该日起加账期天数为尾款日。 */
export const CASH_FLOW_ORDER_TO_ADVANCE_DAYS = 7;

export function computeTotalAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
}

export function computeCashFlowDerivedActuals(
  orderDate: string,
  paymentTermDays: number,
  totalAmount: number,
  actualAdvanceAmount: number | null | undefined,
): {
  actualAdvanceDate: string;
  actualFinalDate: string;
  actualFinalAmount: number;
} {
  const date = orderDate.slice(0, 10);
  const actualAdvanceDate = addCalendarDays(date, CASH_FLOW_ORDER_TO_ADVANCE_DAYS);
  const actualFinalDate = addCalendarDays(actualAdvanceDate, paymentTermDays);
  const adv =
    actualAdvanceAmount != null && !Number.isNaN(actualAdvanceAmount) ? actualAdvanceAmount : 0;
  const actualFinalAmount = Math.round((totalAmount - adv) * 100) / 100;
  return { actualAdvanceDate, actualFinalDate, actualFinalAmount };
}

export type CashFlowValidationInput = {
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  advanceRatioPct: number;
  finalRatioPct: number;
  actualAdvanceAmount: number | null | undefined;
  actualFinalAmount: number | null | undefined;
};

export function validateCashFlowRow(input: CashFlowValidationInput): { ok: true } | { ok: false; message: string } {
  const computed = computeTotalAmount(input.quantity, input.unitPrice);
  if (Math.abs(computed - input.totalAmount) > MONEY_EPS) {
    return {
      ok: false,
      message:
        "订单总金额须等于 订单数量 × 单价。Total must equal quantity × unit price.",
    };
  }
  if (Math.abs(input.advanceRatioPct + input.finalRatioPct - 100) > PCT_EPS) {
    return {
      ok: false,
      message: "预付款比例 + 尾款比例须为 100%。Advance % + final % must equal 100%.",
    };
  }
  const adv = input.actualAdvanceAmount;
  const fin = input.actualFinalAmount;
  if (adv != null && Number.isNaN(adv)) {
    return {
      ok: false,
      message: "实际预付款金额无效。Actual advance amount is invalid.",
    };
  }
  if (fin != null && Number.isNaN(fin)) {
    return {
      ok: false,
      message: "实际尾款金额无效。Actual final amount is invalid.",
    };
  }
  if (adv != null && !Number.isNaN(adv)) {
    if (adv < -MONEY_EPS || adv > input.totalAmount + MONEY_EPS) {
      return {
        ok: false,
        message:
          "实际预付款金额须在 0 与订单总金额之间。Actual advance must be between 0 and total.",
      };
    }
  }
  const advNum = adv != null && !Number.isNaN(adv) ? adv : 0;
  if (fin != null && !Number.isNaN(fin)) {
    if (Math.abs(advNum + fin - input.totalAmount) > MONEY_EPS) {
      return {
        ok: false,
        message:
          "实际尾款须等于 订单总金额 − 实际预付。Actual final must equal total minus actual advance.",
      };
    }
  }
  return { ok: true };
}
