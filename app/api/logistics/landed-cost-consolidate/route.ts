import { NextResponse } from "next/server";

import { isForecastDestinationInputValid } from "@/lib/forecast-destination-countries";
import { parseForecastIncoterm } from "@/lib/forecast-incoterm";
import { upsertLogisticsLandedCostConsolidateSnapshot } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { LogisticsLandedCostConsolidateLineItem, Region } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const REGIONS: ReadonlySet<Region> = new Set(["APAC", "EU", "USA"]);

function parseLineItems(raw: unknown): LogisticsLandedCostConsolidateLineItem[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: LogisticsLandedCostConsolidateLineItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const o = item as Record<string, unknown>;
    const forecastId = String(o.forecastId ?? "").trim();
    const sku = String(o.sku ?? "").trim();
    const region = String(o.region ?? "").trim() as Region;
    const month = String(o.month ?? "").trim();
    const bto = Number(o.buildToOrder);
    const bts = Number(o.buildToStock);
    const qty = Number(o.quantity);
    const productName = String(o.productName ?? "").trim();
    if (!forecastId || !sku || !month) return null;
    if (!REGIONS.has(region)) return null;
    if (!Number.isFinite(bto) || !Number.isFinite(bts) || !Number.isFinite(qty)) return null;
    if (bto < 0 || bts < 0) return null;
    if (Math.trunc(qty) !== Math.trunc(bto) + Math.trunc(bts)) return null;
    out.push({
      forecastId,
      sku,
      buildToOrder: Math.trunc(bto),
      buildToStock: Math.trunc(bts),
      quantity: Math.trunc(qty),
      region,
      month,
      productName,
    });
  }
  return out;
}

function optNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const poNumber = String(body.poNumber ?? "").trim();
  const quoteDate = String(body.quoteDate ?? "").trim();
  const destinationCountry = String(body.destinationCountry ?? "").trim();
  const incoterm = parseForecastIncoterm(body.incoterm);
  const lineItems = parseLineItems(body.lineItems);

  if (!poNumber) {
    return NextResponse.json({ message: "PO number is required" }, { status: 400 });
  }
  if (!quoteDate || !DATE_RE.test(quoteDate)) {
    return NextResponse.json({ message: "Invalid quote date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (incoterm == null) {
    return NextResponse.json({ message: "Invalid incoterm" }, { status: 400 });
  }
  if (destinationCountry && !isForecastDestinationInputValid(destinationCountry)) {
    return NextResponse.json({ message: "Invalid destination country" }, { status: 400 });
  }
  if (!lineItems) {
    return NextResponse.json({ message: "lineItems must be a non-empty array" }, { status: 400 });
  }

  const destinationTariffPct = optNum(body.destinationTariffPct);
  if (body.destinationTariffPct !== undefined && body.destinationTariffPct !== null && body.destinationTariffPct !== "") {
    if (destinationTariffPct == null || destinationTariffPct < 0 || destinationTariffPct > 100) {
      return NextResponse.json({ message: "Destination tariff must be between 0 and 100" }, { status: 400 });
    }
  }

  const seaFreightUsd = optNum(body.seaFreightUsd);
  const airFreightUsd = optNum(body.airFreightUsd);
  if (
    body.seaFreightUsd !== undefined &&
    body.seaFreightUsd !== null &&
    body.seaFreightUsd !== "" &&
    (seaFreightUsd == null || seaFreightUsd < 0)
  ) {
    return NextResponse.json({ message: "Sea freight must be a non-negative number" }, { status: 400 });
  }
  if (
    body.airFreightUsd !== undefined &&
    body.airFreightUsd !== null &&
    body.airFreightUsd !== "" &&
    (airFreightUsd == null || airFreightUsd < 0)
  ) {
    return NextResponse.json({ message: "Air freight must be a non-negative number" }, { status: 400 });
  }

  const consolidatedUsd = optNum(body.consolidatedUsd);

  for (const li of lineItems) {
    if (!session.regions.includes(li.region)) {
      return NextResponse.json({ message: "Forbidden: line item region not in your scope" }, { status: 403 });
    }
  }

  try {
    const { snapshot, quoteSync } = await upsertLogisticsLandedCostConsolidateSnapshot({
      poNumber,
      quoteDate,
      destinationCountry,
      destinationTariffPct,
      seaFreightUsd,
      airFreightUsd,
      incoterm,
      consolidatedUsd,
      lineItems,
      createdBy: session.username,
    });
    return NextResponse.json({ snapshot, quoteSync });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
