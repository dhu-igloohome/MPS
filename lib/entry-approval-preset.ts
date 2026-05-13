/**
 * Preset for a future “submitter → manager approval” workflow on business writes.
 *
 * **Default: off** — no code path uses this yet; throughput and APIs are unchanged.
 *
 * When you implement approval:
 * 1. Set server env `FEATURE_ENTRY_APPROVAL_WORKFLOW` to `1` or `true` only after enforcement exists.
 * 2. At the start of mutating handlers (`POST` / `PATCH` / `DELETE`) for the relevant entities, call
 *    `isEntryApprovalWorkflowEnabled()` and branch on draft vs approved state (DB columns / join table).
 *
 * Suggested first domains: `forecast`, `unit_cost_quote`, `order_progress` (see same names in type below).
 */

export type EntryApprovalDomain =
  | "forecast"
  | "forecast_batch"
  | "forecast_import"
  | "unit_cost_quote"
  | "forecast_cash_flow_row"
  | "order_progress"
  | "order_progress_batch"
  | "contract"
  | "logistics_shipment"
  | "logistics_inventory"
  | "logistics_shipping_report"
  | "landed_cost_consolidate"
  | "cash_flow_entry"
  | "cost_analysis"
  | "supplier"
  | "quality_control"
  | "npi"
  | "mass_production_kanban"
  | "other";

export function isEntryApprovalWorkflowEnabled(): boolean {
  const v = process.env.FEATURE_ENTRY_APPROVAL_WORKFLOW;
  if (!v) return false;
  const t = v.trim().toLowerCase();
  return t === "1" || t === "true" || t === "yes";
}
