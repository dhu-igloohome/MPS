import { NextResponse } from "next/server";

import {
  createForecast,
  findActiveProductByNameAndSku,
  officeExistsByRegion,
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
  const office = String(body.office || "");

  if (!isRegion(region)) {
    return NextResponse.json({ message: "Invalid region" }, { status: 400 });
  }

  if (!session.regions.includes(region)) {
    return NextResponse.json({ message: "Forbidden region" }, { status: 403 });
  }

  if (!(await officeExistsByRegion(region, office))) {
    return NextResponse.json({ message: "Invalid office" }, { status: 400 });
  }

  const month = String(body.month || "");
  const productName = String(body.productName || "");
  const sku = String(body.sku || "");
  const buildToOrder = Number(body.buildToOrder || 0);
  const buildToStock = Number(body.buildToStock || 0);

  if (!month || !productName.trim() || !sku.trim()) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  const product = await findActiveProductByNameAndSku(productName.trim(), sku.trim());
  if (!product) {
    return NextResponse.json({ message: "Invalid product and SKU" }, { status: 400 });
  }

  if (buildToOrder < 0 || buildToStock < 0) {
    return NextResponse.json({ message: "Quantity cannot be negative" }, { status: 400 });
  }

  const entry = await createForecast({
    month,
    region,
    office,
    productName,
    sku,
    buildToOrder,
    buildToStock,
    createdBy: session.username,
  });

  return NextResponse.json({ ok: true, entry });
}
