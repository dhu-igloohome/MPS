import { NextResponse } from "next/server";

import { createShippingReport, listShippingReports } from "@/lib/repositories";
import { isShippingReportSku } from "@/lib/shipping-report-skus";
import { getSession } from "@/lib/session";

function parseMoney(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const entries = await listShippingReports();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const sn = String(body.sn ?? "").trim();
  const sku = String(body.sku ?? "").trim();
  const accessoryQuantity = Number(body.accessoryQuantity ?? 0);
  const paidByIgloo = parseMoney(body.paidByIgloo);
  const paidByCustomer = parseMoney(body.paidByCustomer);
  const sgdPaidByIgloo = parseMoney(body.sgdPaidByIgloo);
  const sgdPaidByCustomer = parseMoney(body.sgdPaidByCustomer);
  const usd = parseMoney(body.usd);

  if (!sn) return NextResponse.json({ message: "SN is required" }, { status: 400 });
  if (!isShippingReportSku(sku)) return NextResponse.json({ message: "Invalid SKU" }, { status: 400 });
  if (!Number.isFinite(accessoryQuantity) || accessoryQuantity < 0) {
    return NextResponse.json({ message: "Invalid Accessory Quantity" }, { status: 400 });
  }
  if ([paidByIgloo, paidByCustomer, sgdPaidByIgloo, sgdPaidByCustomer, usd].some(Number.isNaN)) {
    return NextResponse.json({ message: "Invalid paid amount fields" }, { status: 400 });
  }

  const entry = await createShippingReport({
    sn,
    dateReleased: String(body.dateReleased ?? "").trim() || null,
    consigneeCompanyName: String(body.consigneeCompanyName ?? "").trim(),
    doGrnNumber: String(body.doGrnNumber ?? "").trim(),
    soCoReferenceNumber: String(body.soCoReferenceNumber ?? "").trim(),
    podLink: String(body.podLink ?? "").trim(),
    sku,
    accessoryQuantity,
    accessoryNumber: String(body.accessoryNumber ?? "").trim(),
    requestBy: String(body.requestBy ?? "").trim(),
    poNumber: String(body.poNumber ?? "").trim(),
    btoBts: String(body.btoBts ?? "").trim(),
    purpose: String(body.purpose ?? "").trim(),
    shipFrom: String(body.shipFrom ?? "").trim(),
    shipTo: String(body.shipTo ?? "").trim(),
    shipToRegion: String(body.shipToRegion ?? "").trim(),
    shippingMode: String(body.shippingMode ?? "").trim(),
    shippingMethod: String(body.shippingMethod ?? "").trim(),
    trackingNumber: String(body.trackingNumber ?? "").trim(),
    costCentre: String(body.costCentre ?? "").trim(),
    paidByIgloo,
    paidByCustomer,
    sgdPaidByIgloo,
    sgdPaidByCustomer,
    usd,
    productSerialNo: String(body.productSerialNo ?? "").trim(),
    remarks: String(body.remarks ?? "").trim(),
    createdBy: session.username,
  });
  return NextResponse.json({ ok: true, entry });
}
