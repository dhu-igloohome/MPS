import { NextResponse } from "next/server";

import { toCsvLine } from "@/lib/csv";
import { getSession } from "@/lib/session";

const HEADER = [
  "sn",
  "dateReleased",
  "consigneeCompanyName",
  "doGrnNumber",
  "soCoReferenceNumber",
  "podLink",
  "sku",
  "accessoryQuantity",
  "accessoryNumber",
  "requestBy",
  "poNumber",
  "btoBts",
  "purpose",
  "shipFrom",
  "shipTo",
  "shipToRegion",
  "shippingMode",
  "shippingMethod",
  "trackingNumber",
  "costCentre",
  "paidByIgloo",
  "paidByCustomer",
  "sgdPaidByIgloo",
  "sgdPaidByCustomer",
  "usd",
  "productSerialNo",
  "remarks",
];

const EXAMPLE = [
  "SN-001",
  "2026-03-31",
  "Example Co",
  "DO-001",
  "SO-001",
  "",
  "MLR3-BLE",
  "0",
  "",
  "Alice",
  "PO-1001",
  "BTO",
  "Sample",
  "CN",
  "SG",
  "APAC",
  "Air",
  "Express",
  "TRK-001",
  "CC-01",
  "0",
  "0",
  "0",
  "0",
  "0",
  "",
  "",
];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const csv = [toCsvLine(HEADER), toCsvLine(EXAMPLE)].join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="shipping-report-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
