import { NextResponse } from "next/server";

import { toCsvLine } from "@/lib/csv";
import { getSession } from "@/lib/session";

const HEADER = [
  "month",
  "region",
  "destination",
  "incoterm",
  "product_name",
  "sku",
  "build_to_order",
  "build_to_stock",
  "remark",
];

const EXAMPLE = ["2026-03", "APAC", "Singapore", "EXW", "Example Product", "SKU001", "120", "30", "sample"];

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const csv = [toCsvLine(HEADER), toCsvLine(EXAMPLE)].join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="forecast-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
