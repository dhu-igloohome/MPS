import type { ForecastRegion, Region } from "@/lib/types";

export const OPS_DEPARTMENT = "OPS Department" as const;

export const SHIPMENT_REGIONS: readonly Region[] = ["APAC", "EU", "USA"];

export function isShipmentRegion(value: string): value is Region {
  return (SHIPMENT_REGIONS as readonly string[]).includes(value);
}

/**
 * Region a shipment counts toward. A group under a real region owns its shipments; a group parked
 * under "OPS Department" (shared buffer pool) has no region of its own, so the shipment's own
 * declared region wins — falling back to "OPS Department" for legacy rows that never declared one.
 */
export function effectiveShipmentRegion(
  groupRegion: ForecastRegion | null | undefined,
  shipmentRegion: Region | "",
): ForecastRegion | null {
  if (groupRegion == null) return null;
  if (groupRegion !== OPS_DEPARTMENT) return groupRegion;
  return shipmentRegion || OPS_DEPARTMENT;
}

/**
 * Best-effort guess from the free-text "Ship to" (e.g. "JDM IR", "US FBA", "SG"). Only a pre-fill
 * suggestion for the region dropdown — the user always confirms — so unknown values return "".
 */
export function suggestRegionFromShipTo(shipTo: string): Region | "" {
  const s = shipTo.trim().toUpperCase();
  if (!s) return "";
  if (/^US\b/.test(s) || /\bUSA\b/.test(s)) return "USA";
  if (/^(JDM|IDM|EU)\b/.test(s) || /\b(UK|IR|IRL|IRELAND|IRLAND)\b/.test(s)) return "EU";
  if (/\b(SG|SINGAPORE|THAILAND|AU|AUSTRALIA|MY|MALAYSIA|JP|JAPAN|HK|CN)\b/.test(s)) return "APAC";
  return "";
}
