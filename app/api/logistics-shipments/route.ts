import { NextResponse } from "next/server";

import {
  isLogisticsLocation,
  isLogisticsMovementType,
  isLogisticsShipmentStatus,
  validateLogisticsMovementEndpoints,
} from "@/lib/logistics-shipment-payload";
import {
  createLogisticsShipment,
  findActiveProductByNameAndSku,
  getOrderProgressById,
  listLogisticsShipmentsBySession,
  sessionCanAccessLogisticsEndpoints,
  sessionCanAccessOrderProgressRegion,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

const NOTE_MAX = 2000;
const TRACKING_MAX = 200;
const CARRIER_MAX = 120;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const entries = await listLogisticsShipmentsBySession(session);
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const movementType = String(body.movementType || "");
  const productName = String(body.productName || "");
  const sku = String(body.sku || "");
  const poNumber = String(body.poNumber ?? "").trim().slice(0, 200);
  const quantity = Number(body.quantity);
  const fromLocation = String(body.fromLocation || "");
  const toLocation = String(body.toLocation || "");
  const orderProgressIdRaw = body.orderProgressId;
  const orderProgressId =
    orderProgressIdRaw === null || orderProgressIdRaw === undefined || orderProgressIdRaw === ""
      ? null
      : String(orderProgressIdRaw);
  const trackingNumber = String(body.trackingNumber ?? "").trim().slice(0, TRACKING_MAX);
  const carrier = String(body.carrier ?? "").trim().slice(0, CARRIER_MAX);
  const status = String(body.status || "not_shipped");
  const notes = String(body.notes ?? "").trim().slice(0, NOTE_MAX);

  if (!isLogisticsMovementType(movementType)) {
    return NextResponse.json({ message: "Invalid movement type" }, { status: 400 });
  }
  if (!isLogisticsLocation(fromLocation) || !isLogisticsLocation(toLocation)) {
    return NextResponse.json({ message: "Invalid location" }, { status: 400 });
  }
  const endpointCheck = validateLogisticsMovementEndpoints(movementType, fromLocation, toLocation);
  if (!endpointCheck.ok) {
    return NextResponse.json({ message: endpointCheck.message }, { status: 400 });
  }
  if (!sessionCanAccessLogisticsEndpoints(session, fromLocation, toLocation)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!productName.trim() || !sku.trim()) {
    return NextResponse.json({ message: "Missing product or SKU" }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity < 0) {
    return NextResponse.json({ message: "Invalid quantity" }, { status: 400 });
  }
  if (!isLogisticsShipmentStatus(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const product = await findActiveProductByNameAndSku(productName.trim(), sku.trim());
  if (!product) {
    return NextResponse.json({ message: "Invalid product and SKU" }, { status: 400 });
  }

  if (orderProgressId) {
    if (!/^\d+$/.test(orderProgressId)) {
      return NextResponse.json({ message: "Invalid order progress id" }, { status: 400 });
    }
    const orderRow = await getOrderProgressById(orderProgressId);
    if (!orderRow) {
      return NextResponse.json({ message: "Order progress not found" }, { status: 400 });
    }
    if (
      session.role !== "super_admin" &&
      !sessionCanAccessOrderProgressRegion(session.regions, orderRow.region)
    ) {
      return NextResponse.json({ message: "Cannot link to this order line" }, { status: 403 });
    }
  }

  const entry = await createLogisticsShipment({
    movementType,
    productName,
    sku,
    poNumber,
    quantity,
    fromLocation,
    toLocation,
    orderProgressId,
    trackingNumber,
    carrier,
    status,
    notes,
    createdBy: session.username,
  });

  return NextResponse.json({ ok: true, entry });
}
