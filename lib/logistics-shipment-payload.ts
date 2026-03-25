import type {
  LogisticsLocation,
  LogisticsMovementType,
  LogisticsShipmentStatus,
  OrderProgressRegion,
} from "@/lib/types";

const OFFICES: OrderProgressRegion[] = ["APAC", "EU", "US"];

export function isLogisticsMovementType(value: string): value is LogisticsMovementType {
  return value === "inbound" || value === "transfer";
}

export function isLogisticsLocation(value: string): value is LogisticsLocation {
  return value === "FACTORY" || value === "APAC" || value === "EU" || value === "US";
}

export function isLogisticsShipmentStatus(value: string): value is LogisticsShipmentStatus {
  return (
    value === "not_shipped" ||
    value === "in_transit" ||
    value === "delivered" ||
    value === "cancelled"
  );
}

export function validateLogisticsMovementEndpoints(
  movementType: LogisticsMovementType,
  fromLocation: LogisticsLocation,
  toLocation: LogisticsLocation,
): { ok: true } | { ok: false; message: string } {
  if (fromLocation === toLocation) {
    return { ok: false, message: "From and to must differ" };
  }
  if (movementType === "inbound") {
    if (fromLocation !== "FACTORY") {
      return { ok: false, message: "Inbound shipments must start from FACTORY" };
    }
    if (!OFFICES.includes(toLocation as OrderProgressRegion)) {
      return { ok: false, message: "Inbound destination must be an office region" };
    }
    return { ok: true };
  }
  if (!OFFICES.includes(fromLocation as OrderProgressRegion)) {
    return { ok: false, message: "Transfer origin must be an office region" };
  }
  if (!OFFICES.includes(toLocation as OrderProgressRegion)) {
    return { ok: false, message: "Transfer destination must be an office region" };
  }
  return { ok: true };
}
