import { NextResponse } from "next/server";

import { parseDeliveryPlansInput } from "@/lib/order-progress-delivery-plans";
import {
  createOrderProgressDeletionLog,
  deleteOrderProgressById,
  findActiveProductByNameAndSku,
  forecastPoSkuExistsInRegions,
  getOrderProgressById,
  orderProgressRegionsForSession,
  sessionCanAccessOrderProgressRegion,
  updateOrderProgress,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type {
  OrderProgressOrderType,
  OrderProgressRegion,
  OrderProgressStatus,
} from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isOrderProgressRegion(value: string): value is OrderProgressRegion {
  return value === "APAC" || value === "EU" || value === "US";
}

function isOrderType(value: string): value is OrderProgressOrderType {
  return value === "BTO" || value === "BTS";
}

function isProgress(value: string): value is OrderProgressStatus {
  return value === "not_started" || value === "in_production" || value === "ready_to_ship";
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 });
  }

  const existing = await getOrderProgressById(id);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (!sessionCanAccessOrderProgressRegion(session.regions, existing.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const poNumber = String(body.poNumber ?? "").trim().slice(0, 200);
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

  const entry = await updateOrderProgress({
    id,
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
    deliveryPlans,
  });

  if (!entry) {
    return NextResponse.json({ message: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 });
  }

  const existing = await getOrderProgressById(id);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (!sessionCanAccessOrderProgressRegion(session.regions, existing.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const reason = String(body.reason || "").trim();
  if (!reason) {
    return NextResponse.json({ message: "Deletion reason is required" }, { status: 400 });
  }
  await createOrderProgressDeletionLog({
    orderProgressId: existing.id,
    orderNumber: existing.orderNumber || "",
    forecastNumber: existing.poNumber || "",
    sku: existing.sku,
    region: existing.region,
    reason,
    deletedBy: session.username,
  });
  await deleteOrderProgressById(id);
  return NextResponse.json({ ok: true });
}
