import { NextResponse } from "next/server";

import { parseDeliveryPlansInput } from "@/lib/order-progress-delivery-plans";
import {
  createOrderProgress,
  findActiveProductByNameAndSku,
  forecastPoSkuExistsInRegions,
  listOrderProgressBySessionRegions,
  orderProgressRegionsForSession,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type {
  OrderProgressOrderType,
  OrderProgressRegion,
  OrderProgressStatus,
} from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ORDER_NUMBER_MAX = 200;

function isOrderProgressRegion(value: string): value is OrderProgressRegion {
  return value === "APAC" || value === "EU" || value === "US";
}

function isOrderType(value: string): value is OrderProgressOrderType {
  return value === "BTO" || value === "BTS";
}

function isProgress(value: string): value is OrderProgressStatus {
  return value === "not_started" || value === "in_production" || value === "ready_to_ship";
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const entries = await listOrderProgressBySessionRegions(session.regions);
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const orderNumber = String(body.orderNumber ?? "").trim().slice(0, ORDER_NUMBER_MAX);
  const poNumber = String(body.poNumber ?? "").trim().slice(0, ORDER_NUMBER_MAX);
  const productName = String(body.productName || "");
  const sku = String(body.sku || "");
  const orderDate = String(body.orderDate || "");
  const expectedDeliveryDate = String(body.expectedDeliveryDate || "");
  const orderType = String(body.orderType || "");
  const progress = String(body.progress || "");
  const factoryName = String(body.factoryName || "");
  const region = String(body.region || "");
  const quantity = Number(body.quantity);
  const parsedPlans = parseDeliveryPlansInput(body.deliveryPlans);
  if (!parsedPlans.ok) {
    return NextResponse.json({ message: parsedPlans.message }, { status: 400 });
  }
  const deliveryPlans = parsedPlans.plans;

  if (!productName.trim() || !sku.trim()) {
    return NextResponse.json({ message: "Missing product or SKU" }, { status: 400 });
  }
  if (!poNumber) {
    return NextResponse.json({ message: "PO number is required" }, { status: 400 });
  }

  if (!DATE_RE.test(orderDate)) {
    return NextResponse.json({ message: "Invalid order date" }, { status: 400 });
  }

  if (deliveryPlans.length === 0 && !DATE_RE.test(expectedDeliveryDate)) {
    return NextResponse.json({ message: "Invalid expected delivery date" }, { status: 400 });
  }

  if (!isOrderType(orderType)) {
    return NextResponse.json({ message: "Invalid order type" }, { status: 400 });
  }

  if (!isProgress(progress)) {
    return NextResponse.json({ message: "Invalid progress" }, { status: 400 });
  }

  if (!isOrderProgressRegion(region)) {
    return NextResponse.json({ message: "Invalid region" }, { status: 400 });
  }

  if (!orderProgressRegionsForSession(session.regions).includes(region)) {
    return NextResponse.json({ message: "Forbidden region" }, { status: 403 });
  }

  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0) {
    return NextResponse.json({ message: "Invalid quantity" }, { status: 400 });
  }

  const product = await findActiveProductByNameAndSku(productName.trim(), sku.trim());
  if (!product) {
    return NextResponse.json({ message: "Invalid product and SKU" }, { status: 400 });
  }
  const forecastLinked = await forecastPoSkuExistsInRegions(session.regions, poNumber, sku);
  if (!forecastLinked) {
    return NextResponse.json(
      { message: "PO number + SKU must match an existing Forecast record" },
      { status: 400 },
    );
  }

  const entry = await createOrderProgress({
    orderNumber,
    poNumber,
    productName,
    sku,
    quantity,
    orderDate,
    expectedDeliveryDate,
    orderType,
    progress,
    factoryName,
    region,
    createdBy: session.username,
    deliveryPlans,
  });

  return NextResponse.json({ ok: true, entry });
}
