import { NextResponse } from "next/server";

import {
  parseFulfillmentShipmentFields,
} from "@/lib/order-fulfillment-api";
import { createFulfillmentShipment } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const forecastPoNumber = String(body.forecastPoNumber ?? "").trim();
  const sku = String(body.sku ?? "").trim();
  const forecastMonth = String(body.forecastMonth ?? "").trim().slice(0, 7);

  if (!forecastPoNumber || !sku || !/^\d{4}-\d{2}$/.test(forecastMonth)) {
    return NextResponse.json({ message: "Missing forecast group keys" }, { status: 400 });
  }

  const parsed = parseFulfillmentShipmentFields(body);
  if (!parsed.ok) {
    return NextResponse.json({ message: parsed.message }, { status: 400 });
  }

  try {
    const entry = await createFulfillmentShipment({
      ...parsed.fields,
      forecastPoNumber,
      sku,
      forecastMonth,
      createdBy: session.username,
    });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create shipment failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
