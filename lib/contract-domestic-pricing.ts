/**
 * Domestic (China) contract pricing from a USD-equivalent unit basis.
 * Used only when `suppliers.is_domestic_contract` is true; otherwise contracts stay USD.
 * Tune here first; later can move to DB/env without changing call sites.
 */
export const DOMESTIC_CONTRACT_USD_TO_CNY = 7;
export const DOMESTIC_CONTRACT_VAT_MULTIPLIER = 1.13;
export const DOMESTIC_CONTRACT_CURRENCY = "CNY";

/** Contract line unit in CNY from the same USD basis as international contracts (snapshot / latest quote). */
export function domesticCnyContractUnitFromUsdBasis(usdBasis: number): number {
  const u = Number(usdBasis);
  if (!Number.isFinite(u) || u <= 0) return 0;
  return Math.round(u * DOMESTIC_CONTRACT_USD_TO_CNY * DOMESTIC_CONTRACT_VAT_MULTIPLIER * 100) / 100;
}

/** Reports-only USD basis derived from a supplier-quoted tax-included CNY unit price (4 dp). */
export function usdBasisFromDomesticCnyUnit(cnyTaxIncluded: number): number {
  const c = Number(cnyTaxIncluded);
  if (!Number.isFinite(c) || c <= 0) return 0;
  return (
    Math.round((c / DOMESTIC_CONTRACT_VAT_MULTIPLIER / DOMESTIC_CONTRACT_USD_TO_CNY) * 10000) /
    10000
  );
}
