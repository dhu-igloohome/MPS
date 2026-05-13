import { NextResponse } from "next/server";

import { verifyDashboardExportSnapshot } from "@/lib/dashboard-export-snapshot-token";
import { toCsvLine } from "@/lib/csv";
import {
  getForecastsByRegions,
  getSummaryByMonthAndRegion,
  getSummaryByQuarterAndRegion,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const token = new URL(request.url).searchParams.get("t");
  const pageSnapshot = verifyDashboardExportSnapshot(token, session);

  const monthly = await getSummaryByMonthAndRegion(session.regions);
  const quarterly = await getSummaryByQuarterAndRegion(session.regions);
  const entries = await getForecastsByRegions(session.regions);

  const generatedAt = new Date().toISOString();
  const scopeRegions = session.regions.join(", ");

  const lines: string[] = [];

  lines.push("Dashboard export metadata");
  lines.push(toCsvLine(["generated_at_iso", generatedAt]));
  if (pageSnapshot) {
    lines.push(toCsvLine(["dashboard_page_snapshot_at_iso", pageSnapshot.snapshotAt]));
  }
  lines.push(toCsvLine(["scope_regions", scopeRegions]));
  lines.push(
    toCsvLine([
      "data_reconciliation_note",
      pageSnapshot
        ? "Tabular sections were read again from the database at export time. Compare dashboard_page_snapshot_at_iso with generated_at_iso if you need to reconcile with the on-screen dashboard."
        : "Tabular sections were read at export time. No valid dashboard render token was provided (export link without t=, expired, or regions changed).",
    ]),
  );
  lines.push("");

  lines.push("Monthly Summary by Region");
  lines.push(toCsvLine(["Month", "Region", "Build to Order", "Build to Stock", "Total"]));
  for (const item of monthly) {
    lines.push(
      toCsvLine([
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
    toCsvLine([
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
      toCsvLine([
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
    toCsvLine([
      "Month",
      "PO Number",
      "Region",
      "Destination",
      "Incoterm",
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
      toCsvLine([
        item.month,
        item.poNumber,
        item.region,
        item.destination,
        item.incoterm,
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
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(generatedAt);
  const filename = m
    ? `cockpit-export-${m[1]}_${m[2]}${m[3]}${m[4]}Z.csv`
    : `cockpit-export-${generatedAt.slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Export-Generated-At": generatedAt,
      ...(pageSnapshot ? { "X-Dashboard-Page-Snapshot-At": pageSnapshot.snapshotAt } : {}),
    },
  });
}
