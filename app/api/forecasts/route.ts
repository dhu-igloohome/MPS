import { NextResponse } from "next/server";

import { isForecastDestinationInputValid } from "@/lib/forecast-destination-countries";
import { parseForecastIncoterm } from "@/lib/forecast-incoterm";
import {
  createForecast,
  findActiveProductByNameAndSku,
  forecastPoExistsInRegion,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import { Region } from "@/lib/types";

function isRegion(value: string): value is Region {
  return value === "APAC" || value === "EU" || value === "USA";
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const region = String(body.region || "");

  if (!isRegion(region)) {
    return NextResponse.json({ message: "Invalid region" }, { status: 400 });
  }

  if (!session.regions.includes(region)) {
    return NextResponse.json({ message: "Forbidden region" }, { status: 403 });
  }

  const month = String(body.month || "");
  const productName = String(body.productName || "");
  const sku = String(body.sku || "");
  const destination = String(body.destination || "").trim();
  const poNumber = String(body.poNumber || "").trim();
  const remark = String(body.remark || "");
  const buildToOrder = Number(body.buildToOrder || 0);
  const buildToStock = Number(body.buildToStock || 0);
  const incoterm = parseForecastIncoterm(body.incoterm);

  if (!month || !productName.trim() || !sku.trim() || !destination) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }
  if (!isForecastDestinationInputValid(destination)) {
    return NextResponse.json(
      { message: "Invalid destination country (use the official country name, up to 160 characters)" },
      { status: 400 },
    );
  }
  if (!incoterm) {
    return NextResponse.json({ message: "Incoterm must be EXW, FOB, DAP, or DDP" }, { status: 400 });
  }

  const product = await findActiveProductByNameAndSku(productName.trim(), sku.trim());
  if (!product) {
    return NextResponse.json({ message: "Invalid product and SKU" }, { status: 400 });
  }

  if (buildToOrder < 0 || buildToStock < 0) {
    return NextResponse.json({ message: "Quantity cannot be negative" }, { status: 400 });
  }

  if (poNumber && !(await forecastPoExistsInRegion(region, poNumber))) {
    return NextResponse.json(
      { message: "Provided PO number must already exist in the same region" },
      { status: 400 },
    );
  }

  const entry = await createForecast({
    month,
    region,
    destination,
    incoterm,
    poNumber: poNumber || undefined,
    productName,
    sku,
    remark,
    buildToOrder,
    buildToStock,
    createdBy: session.username,
  });

  return NextResponse.json({ ok: true, entry });
}
