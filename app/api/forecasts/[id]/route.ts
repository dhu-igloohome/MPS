import { NextResponse } from "next/server";

import { isForecastDestinationInputValid } from "@/lib/forecast-destination-countries";
import { parseForecastIncoterm } from "@/lib/forecast-incoterm";
import {
  createForecastDeletionLog,
  deleteForecastById,
  findActiveProductByNameAndSku,
  getForecastById,
  updateForecast,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { Region } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

function isRegion(value: string): value is Region {
  return value === "APAC" || value === "EU" || value === "USA";
}

const FORECAST_OPS_ACTION_OPTIONS = [
  "",
  "Ok to issue PO",
  "Not build new lot because of MOQ",
  "Consider stock transfer from other region",
] as const;

function parseForecastOpsAction(input: unknown): string | null {
  if (input == null) return null;
  const v = String(input).trim();
  return (FORECAST_OPS_ACTION_OPTIONS as readonly string[]).includes(v) ? v : null;
}

const MONTH_RE = /^\d{4}-\d{2}$/;

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 });
  }
  const existing = await getForecastById(id);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (!session.regions.includes(existing.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const region = String(body.region || "");
  const month = String(body.month || "");
  const productName = String(body.productName || "");
  const sku = String(body.sku || "");
  const destination = String(body.destination || "").trim();
  const remark = String(body.remark || "");
  const rawOpsAction = (body as Record<string, unknown>).opsAction;
  let opsAction = parseForecastOpsAction(rawOpsAction);
  const buildToOrder = Number(body.buildToOrder ?? 0);
  const buildToStock = Number(body.buildToStock ?? 0);
  let incoterm = parseForecastIncoterm(body.incoterm);
  if (
    incoterm === null &&
    (!("incoterm" in body) ||
      body.incoterm === undefined ||
      body.incoterm === null ||
      String(body.incoterm).trim() === "")
  ) {
    incoterm = existing.incoterm;
  }
  if (rawOpsAction != null && String(rawOpsAction).trim() !== "" && opsAction === null) {
    return NextResponse.json(
      { message: "Ops action must be one of the allowed options" },
      { status: 400 },
    );
  }
  if (
    opsAction === null &&
    (!("opsAction" in (body as Record<string, unknown>)) ||
      (body as Record<string, unknown>).opsAction === undefined ||
      (body as Record<string, unknown>).opsAction === null ||
      String((body as Record<string, unknown>).opsAction).trim() === "")
  ) {
    opsAction = existing.opsAction;
  }

  if (!isRegion(region)) {
    return NextResponse.json({ message: "Invalid region" }, { status: 400 });
  }
  if (!session.regions.includes(region)) {
    return NextResponse.json({ message: "Forbidden region" }, { status: 403 });
  }
  if (!month || !MONTH_RE.test(month) || !productName.trim() || !sku.trim() || !destination) {
    return NextResponse.json({ message: "Missing or invalid fields" }, { status: 400 });
  }
  if (!isForecastDestinationInputValid(destination)) {
    return NextResponse.json(
      { message: "Invalid destination country (use the official country name, up to 160 characters)" },
      { status: 400 },
    );
  }
  if (!incoterm) {
    return NextResponse.json({ message: "Incoterm must be EXW, FOB, DAP, or DDP" }, { status: 400 });
  }
  if (buildToOrder < 0 || buildToStock < 0) {
    return NextResponse.json({ message: "Quantity cannot be negative" }, { status: 400 });
  }

  const product = await findActiveProductByNameAndSku(productName.trim(), sku.trim());
  if (!product) {
    return NextResponse.json({ message: "Invalid product and SKU" }, { status: 400 });
  }

  const entry = await updateForecast({
    id,
    month,
    region,
    destination,
    incoterm,
    productName: productName.trim(),
    sku: sku.trim(),
    remark: remark.trim(),
    opsAction: opsAction ?? "",
    buildToOrder,
    buildToStock,
  });
  if (!entry) {
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 });
  }
  const row = await getForecastById(id);
  if (!row) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (!session.regions.includes(row.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason || "").trim();
  if (!reason) {
    return NextResponse.json({ message: "Deletion reason is required" }, { status: 400 });
  }
  await createForecastDeletionLog({
    forecastId: row.id,
    poNumber: row.poNumber,
    sku: row.sku,
    region: row.region,
    reason,
    deletedBy: session.username,
  });
  await deleteForecastById(id);
  return NextResponse.json({ ok: true });
}
