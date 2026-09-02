import { CONTRACT_OCCUPIED_STATUSES } from "@/lib/contract-forecast-coverage";
import type { ContractEntry, ForecastEntry, FulfillmentGroup } from "@/lib/types";

/** Same eligibility rule as Cash flow analysis (approved forecast lines only). */
function isCashFlowForecast(f: ForecastEntry): boolean {
  return f.opsAction.trim().toLowerCase() === "ok to issue po";
}

function monthKey(month: string): string {
  return month.trim().slice(0, 7);
}

function groupKey(month: string, poNumber: string, sku: string): string {
  return `${monthKey(month)}|${poNumber.trim()}|${sku.trim()}`;
}

function buildGroups(
  forecasts: ForecastEntry[],
  contracts: ContractEntry[],
  opts: { requireApprovedForecast: boolean; requireContract: boolean },
): FulfillmentGroup[] {
  const eligible = opts.requireApprovedForecast ? forecasts.filter(isCashFlowForecast) : forecasts;
  const byForecastId = new Map<string, ForecastEntry>();
  const groups = new Map<string, FulfillmentGroup>();

  for (const f of eligible) {
    byForecastId.set(f.id, f);
    const key = groupKey(f.month, f.poNumber, f.sku);
    let g = groups.get(key);
    if (!g) {
      g = {
        forecastPoNumber: f.poNumber.trim(),
        sku: f.sku.trim(),
        forecastMonth: monthKey(f.month),
        productName: f.productName,
        region: f.region,
        forecastQty: 0,
        contractedQty: 0,
        mpBatches: [],
        shipFroms: [],
        opsActions: [],
        comments: [],
      };
      groups.set(key, g);
    }
    g.forecastQty +=
      Math.max(0, Math.trunc(f.buildToOrder)) + Math.max(0, Math.trunc(f.buildToStock));
    if (!g.productName && f.productName) g.productName = f.productName;
    const opsAction = f.opsAction.trim();
    if (opsAction && !g.opsActions.includes(opsAction)) g.opsActions.push(opsAction);
    const comment = f.remark.trim();
    if (comment && !g.comments.includes(comment)) g.comments.push(comment);
  }

  for (const c of contracts) {
    if (!CONTRACT_OCCUPIED_STATUSES.includes(c.status)) continue;
    const fid = c.forecastId?.trim();
    if (!fid) continue;
    const f = byForecastId.get(fid);
    if (!f) continue;
    const g = groups.get(groupKey(f.month, f.poNumber, f.sku));
    if (!g) continue;
    g.contractedQty += Math.max(0, Math.trunc(c.quantity));
    const batch = c.batch.trim();
    if (batch && !g.mpBatches.includes(batch)) g.mpBatches.push(batch);
    const supplier = c.supplierName.trim();
    if (supplier && !g.shipFroms.includes(supplier)) g.shipFroms.push(supplier);
  }

  const result = opts.requireContract
    ? [...groups.values()].filter((g) => g.contractedQty > 0)
    : [...groups.values()];

  return result.sort(
    (a, b) =>
      a.forecastMonth.localeCompare(b.forecastMonth) ||
      a.forecastPoNumber.localeCompare(b.forecastPoNumber, undefined, { numeric: true }) ||
      a.sku.localeCompare(b.sku),
  );
}

/**
 * Builds Order fulfillments rows source: Forecast # + SKU groups (per forecast month)
 * that already have created contract quantity (approved/sent contracts linked via forecastId).
 * Used by the internal Order Fulfillments page — unchanged, contract-backed rows only.
 */
export function buildFulfillmentGroups(
  forecasts: ForecastEntry[],
  contracts: ContractEntry[],
): FulfillmentGroup[] {
  return buildGroups(forecasts, contracts, { requireApprovedForecast: true, requireContract: true });
}

/**
 * Same grouping, but for the external integration API (`fulfillment:read`): includes every
 * forecast line regardless of Ops action or whether a contract exists yet, so partners see
 * forecast-stage demand (contractedQty: 0) instead of waiting until a contract is created.
 * Requested by David 2026-08-17 after Berfin's AOP dashboard needed Dec 2026 EU forecasts
 * that hadn't reached "Ok to issue PO" / contract stage yet.
 */
export function buildIntegrationFulfillmentGroups(
  forecasts: ForecastEntry[],
  contracts: ContractEntry[],
): FulfillmentGroup[] {
  return buildGroups(forecasts, contracts, { requireApprovedForecast: false, requireContract: false });
}
