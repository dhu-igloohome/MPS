import { NextResponse } from "next/server";

import { REGIONS } from "@/lib/accounts";
import { authenticateIntegrationRequest } from "@/lib/integration-api-auth";
import { buildFulfillmentGroups } from "@/lib/order-fulfillment-groups";
import type { Region } from "@/lib/types";
import {
  getForecastsByRegions,
  listContractsBySessionRegions,
  listFulfillmentShipments,
} from "@/lib/repositories";

function parseRegionParam(raw: string): Region | null {
  const upper = raw.trim().toUpperCase();
  return (REGIONS as readonly string[]).includes(upper) ? (upper as Region) : null;
}

export async function GET(request: Request) {
  const principal = await authenticateIntegrationRequest(request, "fulfillment:read");
  if (!principal) {
    return NextResponse.json(
      { message: "Unauthorized. Use Authorization: Bearer mps_… with fulfillment:read scope." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const forecastMonth = url.searchParams.get("forecastMonth")?.trim().slice(0, 7) ?? "";
  const sku = url.searchParams.get("sku")?.trim() ?? "";
  const forecastPoNumber = url.searchParams.get("forecastPoNumber")?.trim() ?? "";
  // Unrecognized values (e.g. a typo) are ignored rather than erroring, so a bad param
  // degrades to "no region filter" instead of breaking the partner's integration.
  const region = parseRegionParam(url.searchParams.get("region")?.trim() ?? "");

  const [forecasts, contracts, shipments] = await Promise.all([
    getForecastsByRegions(REGIONS),
    listContractsBySessionRegions(REGIONS),
    listFulfillmentShipments(),
  ]);

  let groups = buildFulfillmentGroups(forecasts, contracts);
  // Shipments have no region column of their own; derive it from the group they belong to
  // (same forecast # + SKU) so every shipment row can carry the same region label/filter.
  const regionByGroupKey = new Map(groups.map((g) => [`${g.forecastPoNumber}|${g.sku}`, g.region]));
  let taggedShipments = shipments.map((s) => ({
    ...s,
    region: regionByGroupKey.get(`${s.forecastPoNumber}|${s.sku}`) ?? null,
  }));

  if (region) {
    groups = groups.filter((g) => g.region === region);
    taggedShipments = taggedShipments.filter((s) => s.region === region);
  }
  if (forecastMonth) {
    groups = groups.filter((g) => g.forecastMonth === forecastMonth);
    taggedShipments = taggedShipments.filter((s) => s.forecastMonth === forecastMonth);
  }
  if (sku) {
    const skuLower = sku.toLowerCase();
    groups = groups.filter((g) => g.sku.toLowerCase() === skuLower);
    taggedShipments = taggedShipments.filter((s) => s.sku.toLowerCase() === skuLower);
  }
  if (forecastPoNumber) {
    const poLower = forecastPoNumber.toLowerCase();
    groups = groups.filter((g) => g.forecastPoNumber.toLowerCase() === poLower);
    taggedShipments = taggedShipments.filter((s) => s.forecastPoNumber.toLowerCase() === poLower);
  }

  return NextResponse.json({
    ok: true,
    groupCount: groups.length,
    shipmentCount: taggedShipments.length,
    groups,
    shipments: taggedShipments,
    fetchedAt: new Date().toISOString(),
  });
}
