import { NextResponse } from "next/server";

import { REGIONS } from "@/lib/accounts";
import { authenticateIntegrationRequest } from "@/lib/integration-api-auth";
import { buildFulfillmentGroups } from "@/lib/order-fulfillment-groups";
import {
  getForecastsByRegions,
  listContractsBySessionRegions,
  listFulfillmentShipments,
} from "@/lib/repositories";

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

  const [forecasts, contracts, shipments] = await Promise.all([
    getForecastsByRegions(REGIONS),
    listContractsBySessionRegions(REGIONS),
    listFulfillmentShipments(),
  ]);

  let groups = buildFulfillmentGroups(forecasts, contracts);
  let filteredShipments = shipments;

  if (forecastMonth) {
    groups = groups.filter((g) => g.forecastMonth === forecastMonth);
    filteredShipments = filteredShipments.filter((s) => s.forecastMonth === forecastMonth);
  }
  if (sku) {
    const skuLower = sku.toLowerCase();
    groups = groups.filter((g) => g.sku.toLowerCase() === skuLower);
    filteredShipments = filteredShipments.filter((s) => s.sku.toLowerCase() === skuLower);
  }
  if (forecastPoNumber) {
    const poLower = forecastPoNumber.toLowerCase();
    groups = groups.filter((g) => g.forecastPoNumber.toLowerCase() === poLower);
    filteredShipments = filteredShipments.filter(
      (s) => s.forecastPoNumber.toLowerCase() === poLower,
    );
  }

  return NextResponse.json({
    ok: true,
    groupCount: groups.length,
    shipmentCount: filteredShipments.length,
    groups,
    shipments: filteredShipments,
    fetchedAt: new Date().toISOString(),
  });
}
