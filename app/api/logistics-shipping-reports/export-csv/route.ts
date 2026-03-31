import { NextResponse } from "next/server";

import { toCsvLine } from "@/lib/csv";
import { listShippingReports } from "@/lib/repositories";
import { getSession } from "@/lib/session";

const HEADER = [
  "id",
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
  "createdBy",
  "createdAt",
  "updatedAt",
];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const entries = await listShippingReports();
  const lines = [toCsvLine(HEADER)];
  for (const e of entries) {
    lines.push(
      toCsvLine([
        e.id,
        e.sn,
        e.dateReleased ?? "",
        e.consigneeCompanyName,
        e.doGrnNumber,
        e.soCoReferenceNumber,
        e.podLink,
        e.sku,
        e.accessoryQuantity,
        e.accessoryNumber,
        e.requestBy,
        e.poNumber,
        e.btoBts,
        e.purpose,
        e.shipFrom,
        e.shipTo,
        e.shipToRegion,
        e.shippingMode,
        e.shippingMethod,
        e.trackingNumber,
        e.costCentre,
        e.paidByIgloo,
        e.paidByCustomer,
        e.sgdPaidByIgloo,
        e.sgdPaidByCustomer,
        e.usd,
        e.productSerialNo,
        e.remarks,
        e.createdBy,
        e.createdAt,
        e.updatedAt,
      ]),
    );
  }

  const filename = `shipping-report-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
