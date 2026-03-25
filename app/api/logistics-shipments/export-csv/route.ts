import { NextResponse } from "next/server";

import { toCsvLine } from "@/lib/csv";
import { listLogisticsShipmentsBySession } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const entries = await listLogisticsShipmentsBySession(session);
  const header = [
    "id",
    "movement_type",
    "product_name",
    "sku",
    "quantity",
    "from_location",
    "to_location",
    "order_progress_id",
    "tracking_number",
    "carrier",
    "status",
    "notes",
    "created_by",
    "created_at",
    "updated_at",
  ];

  const lines = [toCsvLine(header)];
  for (const e of entries) {
    lines.push(
      toCsvLine([
        e.id,
        e.movementType,
        e.productName,
        e.sku,
        e.quantity,
        e.fromLocation,
        e.toLocation,
        e.orderProgressId ?? "",
        e.trackingNumber,
        e.carrier,
        e.status,
        e.notes,
        e.createdBy,
        e.createdAt,
        e.updatedAt,
      ]),
    );
  }

  const csv = lines.join("\n");
  const filename = `logistics-shipments-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
