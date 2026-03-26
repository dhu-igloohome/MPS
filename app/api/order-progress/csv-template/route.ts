import { NextResponse } from "next/server";

import { toCsvLine } from "@/lib/csv";
import { getSession } from "@/lib/session";

const HEADER = [
  "order_number",
  "po_number",
  "product_name",
  "sku",
  "quantity",
  "order_date",
  "expected_delivery_date",
  "order_type",
  "progress",
  "factory_name",
  "region",
];

const EXAMPLE = [
  "PO-2025-001",
  "POA202603260001",
  "Example product name",
  "SKU001",
  "1000",
  "2025-03-01",
  "2025-04-01",
  "BTO",
  "not_started",
  "Factory A",
  "APAC",
];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const lines = [toCsvLine(HEADER), toCsvLine(EXAMPLE)];

  const csv = lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="order-progress-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
