import { NextResponse } from "next/server";

import { isForecastDestinationInputValid } from "@/lib/forecast-destination-countries";
import { createUnitCostQuote, listUnitCostQuotes, unitCostQuoteSkuExists } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { UnitCostQuoteIncoterm } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INCOTERMS: UnitCostQuoteIncoterm[] = ["EXW", "FOB", "DAP", "DDP"];
const CREATION_REASON_MAX_LENGTH = 500;

function optPct(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}

function optFreightUsd(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function parseIncoterm(body: Record<string, unknown>): UnitCostQuoteIncoterm {
  const incotermRaw = String(body.incoterm ?? "EXW").trim().toUpperCase();
  return INCOTERMS.includes(incotermRaw as UnitCostQuoteIncoterm)
    ? (incotermRaw as UnitCostQuoteIncoterm)
    : "EXW";
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const sku = new URL(request.url).searchParams.get("sku")?.trim() ?? "";
  if (sku) {
    const exists = await unitCostQuoteSkuExists(sku);
    return NextResponse.json({ exists });
  }
  const entries = await listUnitCostQuotes();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sku = String(body.sku ?? "").trim();
  const unitPrice = Number(body.unitPrice);
  const taxIncluded = Boolean(body.taxIncluded);
  const supplierName = String(body.supplierName ?? "").trim();
  const quoteDate = String(body.quoteDate ?? "").trim();
  const manufacturerCountry = String(body.manufacturerCountry ?? "").trim();
  const destinationCountry = String(body.destinationCountry ?? "").trim();
  const destinationTariffPct = optPct(body.destinationTariffPct);
  const seaFreightUnitPrice = optFreightUsd(body.seaFreightUnitPrice);
  const airFreightUnitPrice = optFreightUsd(body.airFreightUnitPrice);
  const incoterm = parseIncoterm(body);
  const creationReason = String(body.creationReason ?? "").trim();

  if (!sku) {
    return NextResponse.json({ message: "SKU is required" }, { status: 400 });
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return NextResponse.json({ message: "Invalid unit price" }, { status: 400 });
  }
  if (!supplierName) {
    return NextResponse.json({ message: "Supplier name is required" }, { status: 400 });
  }
  if (!quoteDate || !DATE_RE.test(quoteDate)) {
    return NextResponse.json({ message: "Invalid quote date (YYYY-MM-DD)" }, { status: 400 });
  }
  if (
    body.destinationTariffPct !== undefined &&
    body.destinationTariffPct !== null &&
    body.destinationTariffPct !== "" &&
    destinationTariffPct === null
  ) {
    return NextResponse.json({ message: "Destination tariff must be between 0 and 100" }, { status: 400 });
  }
  if (
    body.seaFreightUnitPrice !== undefined &&
    body.seaFreightUnitPrice !== null &&
    body.seaFreightUnitPrice !== "" &&
    seaFreightUnitPrice === null
  ) {
    return NextResponse.json({ message: "Sea freight unit price must be a non-negative number" }, { status: 400 });
  }
  if (
    body.airFreightUnitPrice !== undefined &&
    body.airFreightUnitPrice !== null &&
    body.airFreightUnitPrice !== "" &&
    airFreightUnitPrice === null
  ) {
    return NextResponse.json({ message: "Air freight unit price must be a non-negative number" }, { status: 400 });
  }
  if (destinationCountry && !isForecastDestinationInputValid(destinationCountry)) {
    return NextResponse.json(
      { message: "Invalid destination country (use the official country name, up to 160 characters)" },
      { status: 400 },
    );
  }
  if (creationReason.length > CREATION_REASON_MAX_LENGTH) {
    return NextResponse.json({ message: "Creation reason must be 500 characters or fewer" }, { status: 400 });
  }
  const skuExists = await unitCostQuoteSkuExists(sku);
  if (skuExists && !creationReason) {
    return NextResponse.json({ message: "Duplicate SKU requires a creation reason" }, { status: 400 });
  }

  try {
    const entry = await createUnitCostQuote({
      sku,
      unitPrice,
      taxIncluded,
      supplierName,
      quoteDate,
      manufacturerCountry,
      destinationCountry,
      destinationTariffPct,
      cmUnitPriceTaxRatePct: null,
      seaFreightUnitPrice,
      airFreightUnitPrice,
      incoterm,
      creationReason,
      createdBy: session.username,
    });
    return NextResponse.json({ entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
