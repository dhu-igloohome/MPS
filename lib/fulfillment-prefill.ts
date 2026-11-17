import { OPS_DEPARTMENT, suggestRegionFromShipTo } from "@/lib/fulfillment-region";
import type { ForecastRegion, Region } from "@/lib/types";

export type PrefillSuggestion = {
  soQuantity?: string;
  estimatedReadyDate?: string;
  shipTo?: string;
  freightMode?: string;
  region?: Region;
  deliveryStatus: "In preparation";
};

type PrefillGroup = {
  region: ForecastRegion;
  forecastQty: number;
  contractedQty: number;
  contractDeliveryDate: string | null;
};

/** The group's other shipments, with LIVE (possibly unsaved) quantities. */
type PrefillSibling = { soQuantity: number; shipTo: string; freightMode: string; region: Region | "" };

/** The shared value if every non-empty entry agrees, otherwise "" — never guess between differing ones. */
function agreed(values: string[]): string {
  const set = new Set(values.map((v) => v.trim()).filter(Boolean));
  return set.size === 1 ? [...set][0] : "";
}

/**
 * Starting values for a new shipment of a Forecast # + SKU group, taken from what is already known:
 * the contract (quantity, delivery date) and the group's earlier shipments. Quantity is what is left
 * after the other shipments; Ship to / Freight mode are copied only when ALL earlier shipments agree,
 * so a mixed air/sea history isn't silently defaulted to one of them.
 */
export function suggestShipmentFields(group: PrefillGroup, siblings: PrefillSibling[]): PrefillSuggestion {
  const total = group.contractedQty > 0 ? group.contractedQty : group.forecastQty;
  const used = siblings.reduce(
    (sum, s) => sum + (Number.isFinite(s.soQuantity) && s.soQuantity > 0 ? Math.trunc(s.soQuantity) : 0),
    0,
  );
  const remaining = total - used;

  const out: PrefillSuggestion = { deliveryStatus: "In preparation" };
  if (remaining > 0) out.soQuantity = String(remaining);
  if (group.contractDeliveryDate) out.estimatedReadyDate = group.contractDeliveryDate;

  const shipTo = agreed(siblings.map((s) => s.shipTo));
  if (shipTo) out.shipTo = shipTo;
  const freightMode = agreed(siblings.map((s) => s.freightMode));
  if (freightMode) out.freightMode = freightMode;

  if (group.region === OPS_DEPARTMENT) {
    const region = (agreed(siblings.map((s) => s.region)) || suggestRegionFromShipTo(shipTo)) as Region | "";
    if (region) out.region = region;
  }
  return out;
}
