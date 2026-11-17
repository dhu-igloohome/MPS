import type { FulfillmentShipmentEntry } from "@/lib/types";

export type FulfillmentIssueCode =
  | "etaPassed"
  | "noEta"
  | "noTracking"
  | "noSo"
  | "noShipTo"
  | "noStatus";

export type FulfillmentIssue = { code: FulfillmentIssueCode; days?: number };

/** Punctuation/symbols only ("/", "-", "--") or an explicit "not available" word is not an SO number. */
export function isPlaceholderSoNumber(raw: string): boolean {
  const s = raw.trim();
  if (!s) return false;
  return /^[\p{P}\p{S}\s]+$/u.test(s) || /^(n\/?a|tbd|none|null|nil)$/i.test(s);
}

function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

type IssueInput = Pick<
  FulfillmentShipmentEntry,
  "deliveryStatus" | "eta" | "trackingLink" | "soNumber" | "shipTo"
>;

/**
 * What someone still has to do on a saved shipment. Delivered shipments are finished, so they never
 * have issues. `todayIso` (YYYY-MM-DD) is passed in rather than read from the clock so the server
 * render and the client hydration agree.
 */
export function shipmentIssues(s: IssueInput, todayIso: string): FulfillmentIssue[] {
  if (s.deliveryStatus === "Delivered") return [];
  const issues: FulfillmentIssue[] = [];
  if (s.eta && s.eta < todayIso) {
    issues.push({ code: "etaPassed", days: daysBetween(s.eta, todayIso) });
  }
  if (s.deliveryStatus === "In transit") {
    if (!s.eta) issues.push({ code: "noEta" });
    if (!s.trackingLink.trim()) issues.push({ code: "noTracking" });
  }
  if (!s.soNumber.trim() || isPlaceholderSoNumber(s.soNumber)) {
    // "Pending trigger SO" means the SO is not issued yet, so a missing SO number is expected there.
    if (s.deliveryStatus !== "Pending trigger SO") issues.push({ code: "noSo" });
  }
  if (!s.shipTo.trim()) issues.push({ code: "noShipTo" });
  if (!s.deliveryStatus) issues.push({ code: "noStatus" });
  return issues;
}
