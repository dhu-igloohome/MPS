import { NextResponse } from "next/server";

import {
  getForecastsByRegions,
  getSummaryByMonthAndRegion,
  getSummaryByQuarterAndRegion,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

function escapeCsv(value: string | number) {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function toCsvRow(columns: Array<string | number>) {
  return columns.map(escapeCsv).join(",");
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const monthly = await getSummaryByMonthAndRegion(session.regions);
  const quarterly = await getSummaryByQuarterAndRegion(session.regions);
  const entries = await getForecastsByRegions(session.regions);

  const lines: string[] = [];

  lines.push("Monthly Summary by Region");
  lines.push(toCsvRow(["Month", "Region", "Build to Order", "Build to Stock", "Total"]));
  for (const item of monthly) {
    lines.push(
      toCsvRow([
        item.month,
        item.region,
        item.buildToOrder,
        item.buildToStock,
        item.buildToOrder + item.buildToStock,
      ]),
    );
  }

  lines.push("");
  lines.push("Quarterly Summary by Region");
  lines.push(
    toCsvRow([
      "Quarter",
      "Region",
      "Build to Order",
      "Build to Stock",
      "Forecast Total",
      "SKU Count",
    ]),
  );
  for (const item of quarterly) {
    lines.push(
      toCsvRow([
        item.quarter,
        item.region,
        item.buildToOrder,
        item.buildToStock,
        item.buildToOrder + item.buildToStock,
        item.skuCount,
      ]),
    );
  }

  lines.push("");
  lines.push("Latest Forecast Entries");
  lines.push(
    toCsvRow([
      "Month",
      "Region",
      "Office",
      "Product Name",
      "SKU",
      "Build to Order",
      "Build to Stock",
      "Created By",
      "Created At",
    ]),
  );
  for (const item of entries) {
    lines.push(
      toCsvRow([
        item.month,
        item.region,
        item.office,
        item.productName,
        item.sku,
        item.buildToOrder,
        item.buildToStock,
        item.createdBy,
        item.createdAt,
      ]),
    );
  }

  const csv = lines.join("\n");
  const filename = `cockpit-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
