import { DOMESTIC_CONTRACT_USD_TO_CNY, DOMESTIC_CONTRACT_VAT_MULTIPLIER } from "@/lib/contract-domestic-pricing";
import type { ContractEntry, ContractStatus, ForecastCashFlowRow } from "@/lib/types";

export const CONTRACT_OCCUPIED_STATUSES: ContractStatus[] = ["approved", "sent"];

export type ForecastRowCoverage = {
  forecastId: string;
  poNumber: string;
  productName: string;
  buildToOrder: number;
  buildToStock: number;
  forecastQty: number;
  forecastAmountUsd: number | null;
  contractedQty: number;
  contractedAmountUsd: number;
  remainingQty: number;
  remainingAmountUsd: number | null;
};

export type SkuContractCoverage = {
  sku: string;
  forecastQty: number;
  forecastAmountUsd: number;
  contractedQty: number;
  contractedAmountByCurrency: Record<string, number>;
  remainingQty: number;
  remainingAmountUsd: number;
  rows: ForecastRowCoverage[];
};

export type ForecastContractCoverageSummary = {
  bySku: Record<string, SkuContractCoverage>;
  pendingSkuCount: number;
  pendingQty: number;
  pendingAmountUsd: number;
};

function forecastRowQty(row: ForecastCashFlowRow): number {
  return Math.max(0, Math.trunc(row.buildToOrder)) + Math.max(0, Math.trunc(row.buildToStock));
}

export function forecastLineTotalUsd(row: ForecastCashFlowRow): number | null {
  if (row.unitPriceUsd == null) return null;
  const qty = forecastRowQty(row);
  if (qty <= 0) return null;
  return row.unitPriceUsd * qty;
}

function isOccupiedContract(c: ContractEntry): boolean {
  return CONTRACT_OCCUPIED_STATUSES.includes(c.status);
}

function contractTotalUsdEquivalent(c: ContractEntry): number {
  const amt = Number(c.totalAmount ?? 0);
  if (!Number.isFinite(amt) || amt <= 0) return 0;
  if ((c.currency || "").toUpperCase() === "CNY") {
    return amt / DOMESTIC_CONTRACT_USD_TO_CNY / DOMESTIC_CONTRACT_VAT_MULTIPLIER;
  }
  // Phase 1: only USD and domestic CNY need conversion for coverage.
  return amt;
}

export function computeForecastContractCoverage(
  forecastRows: ForecastCashFlowRow[],
  contracts: ContractEntry[],
): ForecastContractCoverageSummary {
  const occupied = contracts.filter(isOccupiedContract);

  const qtyByForecastId = new Map<string, number>();
  const amountByForecastId = new Map<string, number>();
  for (const c of occupied) {
    const fid = c.forecastId?.trim();
    if (!fid) continue;
    qtyByForecastId.set(fid, (qtyByForecastId.get(fid) ?? 0) + c.quantity);
    amountByForecastId.set(fid, (amountByForecastId.get(fid) ?? 0) + contractTotalUsdEquivalent(c));
  }

  const bySku: Record<string, SkuContractCoverage> = {};

  for (const row of forecastRows) {
    const sku = row.sku.trim() || "—";
    const forecastQty = forecastRowQty(row);
    const lineUsd = forecastLineTotalUsd(row);
    const contractedQty = qtyByForecastId.get(row.id) ?? 0;
    const contractedAmountUsd = amountByForecastId.get(row.id) ?? 0;
    const remainingQty = Math.max(0, forecastQty - contractedQty);
    const unitUsd =
      lineUsd != null && forecastQty > 0 ? lineUsd / forecastQty : row.unitPriceUsd ?? null;
    const remainingAmountUsd =
      unitUsd != null ? Math.max(0, unitUsd * remainingQty) : lineUsd != null ? Math.max(0, lineUsd - contractedAmountUsd) : null;

    const rowCov: ForecastRowCoverage = {
      forecastId: row.id,
      poNumber: row.poNumber,
      productName: row.productName,
      buildToOrder: row.buildToOrder,
      buildToStock: row.buildToStock,
      forecastQty,
      forecastAmountUsd: lineUsd,
      contractedQty,
      contractedAmountUsd,
      remainingQty,
      remainingAmountUsd,
    };

    const existing = bySku[sku];
    if (!existing) {
      bySku[sku] = {
        sku,
        forecastQty: 0,
        forecastAmountUsd: 0,
        contractedQty: 0,
        contractedAmountByCurrency: {},
        remainingQty: 0,
        remainingAmountUsd: 0,
        rows: [],
      };
    }
    const g = bySku[sku];
    g.forecastQty += forecastQty;
    g.forecastAmountUsd += lineUsd ?? 0;
    g.remainingQty += remainingQty;
    g.remainingAmountUsd += remainingAmountUsd ?? 0;
    g.rows.push(rowCov);
  }

  for (const g of Object.values(bySku)) {
    const skuOccupied = occupied.filter((c) => c.sku.trim() === g.sku);
    g.contractedQty = skuOccupied.reduce((s, c) => s + c.quantity, 0);
    g.contractedAmountByCurrency = {};
    for (const c of skuOccupied) {
      const cur = c.currency || "USD";
      g.contractedAmountByCurrency[cur] = (g.contractedAmountByCurrency[cur] ?? 0) + c.totalAmount;
    }
  }

  let pendingSkuCount = 0;
  let pendingQty = 0;
  let pendingAmountUsd = 0;
  for (const g of Object.values(bySku)) {
    if (g.remainingQty > 0) {
      pendingSkuCount += 1;
      pendingQty += g.remainingQty;
      pendingAmountUsd += g.remainingAmountUsd;
    }
  }

  return { bySku, pendingSkuCount, pendingQty, pendingAmountUsd };
}

export function formatCoverageToast(
  summary: ForecastContractCoverageSummary,
  language: "en" | "zh",
): string {
  const en = language === "en";
  if (summary.pendingSkuCount === 0) {
    return en
      ? "Contract(s) created. All SKUs in Forecast cash flow are fully covered (approved/sent)."
      : "合同已创建。Forecast 现金流中的 SKU 已全部覆盖（已批准/已发送）。";
  }
  return en
    ? `Contract(s) created. Company-wide: ${summary.pendingSkuCount} SKU(s), ${summary.pendingQty} unit(s), ~${summary.pendingAmountUsd.toFixed(2)} USD equivalent still not covered (approved/sent only).`
    : `合同已创建。全公司尚有 ${summary.pendingSkuCount} 个 SKU、${summary.pendingQty} 件、约 ${summary.pendingAmountUsd.toFixed(2)} USD 等值未覆盖（仅计已批准/已发送）。`;
}
