import { NextResponse } from "next/server";

import { isForecastDestinationInputValid } from "@/lib/forecast-destination-countries";
import { updateUnitCostQuote } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { UnitCostQuoteIncoterm } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INCOTERMS: UnitCostQuoteIncoterm[] = ["EXW", "FOB", "DAP", "DDP"];

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

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const idTrim = String(id ?? "").trim();
  if (!idTrim || !Number.isFinite(Number(idTrim)) || Number(idTrim) <= 0) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sku = String(body.sku ?? "").trim();
  const unitPrice = Number(body.unitPrice);
  const taxIncluded = Boolean(body.taxIncluded);
  const supplierName = String(body.supplierName ?? "").trim();
  const quoteDate = String(body.quoteDate ?? "").trim();
  const manufacturerCountry = String(body.manufacturerCountry ?? "").trim();
  const destinationCountry = String(body.destinationCountry ?? "").trim();
  const destinationTariffPct = optPct(body.destinationTariffPct);
  const cmUnitPriceTaxRatePct = optPct(body.cmUnitPriceTaxRatePct);
  const seaFreightUnitPrice = optFreightUsd(body.seaFreightUnitPrice);
  const airFreightUnitPrice = optFreightUsd(body.airFreightUnitPrice);
  const incotermRaw = String(body.incoterm ?? "EXW").trim().toUpperCase();
  const incoterm = INCOTERMS.includes(incotermRaw as UnitCostQuoteIncoterm)
    ? (incotermRaw as UnitCostQuoteIncoterm)
    : null;

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
  if (incoterm == null) {
    return NextResponse.json({ message: "Invalid incoterm (EXW, FOB, DAP, or DDP)" }, { status: 400 });
  }
  if (body.destinationTariffPct !== undefined && body.destinationTariffPct !== "" && destinationTariffPct === null) {
    return NextResponse.json({ message: "Destination tariff must be between 0 and 100" }, { status: 400 });
  }
  if (body.cmUnitPriceTaxRatePct !== undefined && body.cmUnitPriceTaxRatePct !== "" && cmUnitPriceTaxRatePct === null) {
    return NextResponse.json({ message: "CM tax rate must be between 0 and 100" }, { status: 400 });
  }
  if (body.seaFreightUnitPrice !== undefined && body.seaFreightUnitPrice !== "" && seaFreightUnitPrice === null) {
    return NextResponse.json({ message: "Sea freight unit price must be a non-negative number" }, { status: 400 });
  }
  if (body.airFreightUnitPrice !== undefined && body.airFreightUnitPrice !== "" && airFreightUnitPrice === null) {
    return NextResponse.json({ message: "Air freight unit price must be a non-negative number" }, { status: 400 });
  }
  if (destinationCountry && !isForecastDestinationInputValid(destinationCountry)) {
    return NextResponse.json(
      { message: "Invalid destination country (use the official country name, up to 160 characters)" },
      { status: 400 },
    );
  }

  try {
    const entry = await updateUnitCostQuote({
      id: idTrim,
      sku,
      unitPrice,
      taxIncluded,
      supplierName,
      quoteDate,
      manufacturerCountry,
      destinationCountry,
      destinationTariffPct,
      cmUnitPriceTaxRatePct,
      seaFreightUnitPrice,
      airFreightUnitPrice,
      incoterm,
    });
    if (!entry) {
      return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
