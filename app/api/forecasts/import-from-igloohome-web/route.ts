import { NextResponse } from "next/server";

import { isForecastDestinationInputValid } from "@/lib/forecast-destination-countries";
import {
  createForecast,
  findActiveProductByNameAndSku,
  findActiveProductBySku,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { Region } from "@/lib/types";

const MONTH_RE = /^\d{4}-\d{2}$/;
const DEFAULT_TRACKER_ORIGIN = "https://igloohome-web.vercel.app";
const MAX_ROWS = 500;

/** Canonical English destination names (must match Product / forecast country list). */
const DEFAULT_DESTINATION_BY_REGION: Record<Region, string> = {
  APAC: "Singapore",
  EU: "Germany",
  USA: "United States",
};

function isRegion(value: unknown): value is Region {
  return value === "APAC" || value === "EU" || value === "USA";
}

type TrackerMetric = {
  sku?: string;
  description?: string;
  [key: string]: unknown;
};

function readMonthlyQty(metric: TrackerMetric, year: number, month: number): number {
  const block = metric[`sales${year}Monthly`];
  if (!block || typeof block !== "object") return 0;
  const rec = block as Record<string, unknown>;
  const keys = [String(month), String(month).padStart(2, "0")];
  for (const k of keys) {
    const v = rec[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return 0;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }
  const { month, region } = body as { month?: string; region?: string };
  if (!month || typeof month !== "string" || !MONTH_RE.test(month.trim())) {
    return NextResponse.json({ message: "Invalid month (YYYY-MM)" }, { status: 400 });
  }
  if (!isRegion(region)) {
    return NextResponse.json({ message: "Invalid region" }, { status: 400 });
  }
  if (!session.regions.includes(region)) {
    return NextResponse.json({ message: "Forbidden region for your account" }, { status: 403 });
  }

  const ym = month.trim();
  const y = Number(ym.slice(0, 4));
  const mo = Number(ym.slice(5, 7));
  if (mo < 1 || mo > 12) {
    return NextResponse.json({ message: "Invalid month (YYYY-MM)" }, { status: 400 });
  }

  const origin = (process.env.IGLOOHOME_SKU_TRACKER_ORIGIN || DEFAULT_TRACKER_ORIGIN).replace(/\/+$/, "");
  let upstream: Response;
  try {
    upstream = await fetch(`${origin}/api/data`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 0 },
    });
  } catch {
    return NextResponse.json(
      { message: "Could not reach SKU Tracker. Check network or IGLOOHOME_SKU_TRACKER_ORIGIN." },
      { status: 502 },
    );
  }
  if (!upstream.ok) {
    return NextResponse.json(
      { message: `SKU Tracker returned HTTP ${upstream.status}` },
      { status: 502 },
    );
  }

  const payload = (await upstream.json().catch(() => null)) as { metrics?: unknown } | null;
  const metrics = Array.isArray(payload?.metrics) ? payload!.metrics! : [];
  const destination = DEFAULT_DESTINATION_BY_REGION[region];
  if (!isForecastDestinationInputValid(destination)) {
    return NextResponse.json({ message: "Default destination configuration error" }, { status: 500 });
  }

  const errors: { sku: string; message: string }[] = [];
  let created = 0;
  let considered = 0;
  let withPositiveQty = 0;

  for (const raw of metrics) {
    if (considered >= MAX_ROWS) break;
    const metric = raw as TrackerMetric;
    const sku = String(metric.sku || "").trim();
    const description = String(metric.description || "").trim();
    if (!sku) continue;

    const qtyFloat = readMonthlyQty(metric, y, mo);
    const buildToOrder = Math.max(0, Math.round(qtyFloat));
    if (buildToOrder === 0) continue;
    withPositiveQty += 1;
    considered += 1;

    const productName = description || sku;
    let product = await findActiveProductByNameAndSku(productName, sku);
    if (!product) {
      product = await findActiveProductBySku(sku);
    }
    if (!product) {
      errors.push({ sku, message: "No matching active product for SKU" });
      continue;
    }

    try {
      await createForecast({
        month: ym,
        region,
        destination,
        incoterm: "EXW",
        productName: product.productName,
        sku: product.sku,
        remark: `SKU Tracker import (${origin}, ${ym})`,
        buildToOrder,
        buildToStock: 0,
        createdBy: session.username,
      });
      created += 1;
    } catch (e) {
      errors.push({ sku, message: e instanceof Error ? e.message : "Create failed" });
    }
  }

  const emptyMonth =
    withPositiveQty === 0
      ? "No SKU Tracker rows with quantity for this month (upstream may only expose sales2026Monthly, etc.)."
      : undefined;

  return NextResponse.json({
    ok: true,
    created,
    failed: errors.length,
    errors: errors.slice(0, 50),
    source: `${origin}/api/data`,
    message: emptyMonth,
  });
}
