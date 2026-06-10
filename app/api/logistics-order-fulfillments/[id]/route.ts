import { NextResponse } from "next/server";

import { parseFulfillmentShipmentFields } from "@/lib/order-fulfillment-api";
import { deleteFulfillmentShipment, updateFulfillmentShipment } from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseFulfillmentShipmentFields(body);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  const entry = await updateFulfillmentShipment(id, parsed.fields);
  if (!entry) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const ok = await deleteFulfillmentShipment(id);
  if (!ok) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
