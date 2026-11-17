import { isPlaceholderSoNumber } from "@/lib/fulfillment-attention";
import { isShipmentRegion, OPS_DEPARTMENT } from "@/lib/fulfillment-region";
import type {
  ForecastRegion,
  FulfillmentDeliveryStatus,
  FulfillmentFreightMode,
  Region,
} from "@/lib/types";
import type { FulfillmentShipmentFieldsInput } from "@/lib/repositories";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const FREIGHT_MODES = new Set<string>(["", "sea", "air", "rail", "road"]);

const DELIVERY_STATUSES = new Set<string>([
  "",
  "Delivered",
  "In transit",
  "Pending trigger SO",
  "In preparation",
]);

type ParseResult =
  | { ok: true; fields: FulfillmentShipmentFieldsInput }
  | { ok: false; message: string };

function parseDate(raw: unknown, label: string): { value: string | null; error?: string } {
  const s = String(raw ?? "").trim();
  if (!s) return { value: null };
  if (!DATE_RE.test(s)) return { value: null, error: `Invalid ${label} date (YYYY-MM-DD)` };
  return { value: s };
}

/**
 * A shipment only carries its own region when its group is parked under "OPS Department" (shared
 * buffer pool, which has no region) — there it is mandatory, because that is the only place the
 * region is ever decided. Everywhere else the group's own region applies, so any value is dropped.
 */
export function resolveShipmentRegion(
  groupRegion: ForecastRegion | null,
  requested: Region | "",
): { ok: true; region: Region | "" } | { ok: false; message: string } {
  if (groupRegion !== OPS_DEPARTMENT) return { ok: true, region: "" };
  if (!requested) {
    return {
      ok: false,
      message:
        "Region is required: this shipment draws from the shared OPS Department buffer, so choose which region it is going to.",
    };
  }
  return { ok: true, region: requested };
}

/** Shared validation for POST (create) and PATCH (update) shipment bodies. */
export function parseFulfillmentShipmentFields(body: Record<string, unknown>): ParseResult {
  const estimatedReady = parseDate(body.estimatedReadyDate, "estimated production readiness");
  if (estimatedReady.error) return { ok: false, message: estimatedReady.error };
  const etd = parseDate(body.etd, "ETD");
  if (etd.error) return { ok: false, message: etd.error };
  const eta = parseDate(body.eta, "ETA");
  if (eta.error) return { ok: false, message: eta.error };

  const soQuantity = Number(body.soQuantity ?? 0);
  if (!Number.isFinite(soQuantity) || !Number.isInteger(soQuantity) || soQuantity < 0) {
    return { ok: false, message: "Invalid SO quantity" };
  }

  const freightMode = String(body.freightMode ?? "").trim();
  if (!FREIGHT_MODES.has(freightMode)) {
    return { ok: false, message: "Invalid freight mode" };
  }

  const deliveryStatus = String(body.deliveryStatus ?? "").trim();
  if (!DELIVERY_STATUSES.has(deliveryStatus)) {
    return { ok: false, message: "Invalid delivery status" };
  }

  const region = String(body.region ?? "").trim();
  if (region !== "" && !isShipmentRegion(region)) {
    return { ok: false, message: "Invalid region" };
  }

  if (isPlaceholderSoNumber(String(body.soNumber ?? ""))) {
    return {
      ok: false,
      message: "SO number looks like a placeholder. Enter the real SO number, or leave it empty until it is issued.",
    };
  }

  return {
    ok: true,
    fields: {
      estimatedReadyDate: estimatedReady.value,
      soNumber: String(body.soNumber ?? "").trim(),
      soUrl: String(body.soUrl ?? "").trim(),
      soQuantity,
      freightMode: freightMode as FulfillmentFreightMode,
      shipTo: String(body.shipTo ?? "").trim(),
      region: region as Region | "",
      etd: etd.value,
      eta: eta.value,
      trackingLink: String(body.trackingLink ?? "").trim(),
      deliveryStatus: deliveryStatus as FulfillmentDeliveryStatus,
    },
  };
}
