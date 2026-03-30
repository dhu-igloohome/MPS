/** Cash flow: 数量×单价=总金额；预付%+尾款%=100%；实际预付+实际尾款=总金额（若均填写）。单价须与成本分析一致（见 cash-flow-cost-analysis-link）。 */

const MONEY_EPS = 0.02;
const PCT_EPS = 0.05;

export function computeTotalAmount(quantity: number, unitPrice: number): number {
  return Math.round(quantity * unitPrice * 100) / 100;
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
  if (adv != null && fin != null && !Number.isNaN(adv) && !Number.isNaN(fin)) {
    if (Math.abs(adv + fin - input.totalAmount) > MONEY_EPS) {
      return {
        ok: false,
        message:
          "实际预付款金额 + 实际支付尾款金额须等于 订单总金额。Actual advance + actual final must equal total.",
      };
    }
  }
  return { ok: true };
}
