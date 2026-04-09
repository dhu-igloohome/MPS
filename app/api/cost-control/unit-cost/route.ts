import { NextResponse } from "next/server";

import { createUnitCostQuote, listUnitCostQuotes } from "@/lib/repositories";
import { getSession } from "@/lib/session";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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

  try {
    const entry = await createUnitCostQuote({
      sku,
      unitPrice,
      taxIncluded,
      supplierName,
      quoteDate,
      createdBy: session.username,
    });
    return NextResponse.json({ entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
