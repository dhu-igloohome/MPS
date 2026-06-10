import type { FulfillmentDeliveryStatus, FulfillmentFreightMode } from "@/lib/types";
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

  return {
    ok: true,
    fields: {
      estimatedReadyDate: estimatedReady.value,
      soNumber: String(body.soNumber ?? "").trim(),
      soUrl: String(body.soUrl ?? "").trim(),
      soQuantity,
      freightMode: freightMode as FulfillmentFreightMode,
      shipTo: String(body.shipTo ?? "").trim(),
      etd: etd.value,
      eta: eta.value,
      trackingLink: String(body.trackingLink ?? "").trim(),
      deliveryStatus: deliveryStatus as FulfillmentDeliveryStatus,
    },
  };
}
