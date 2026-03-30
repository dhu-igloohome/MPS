/** 金额展示为美元（含 $ 符号），与 Cost / Cash flow 板块一致 */
export function formatUsd(amount: number, fractionDigits: number = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}
