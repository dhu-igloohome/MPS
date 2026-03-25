import { NextResponse } from "next/server";

import {
  createAdminAuditLog,
  listProductionStepTemplates,
  productExistsByNameAndSku,
  replaceProductionStepTemplates,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const productName = String(searchParams.get("productName") || "").trim();
  const sku = String(searchParams.get("sku") || "").trim();
  if (!productName || !sku) {
    return NextResponse.json({ message: "Missing productName or sku" }, { status: 400 });
  }

  const steps = await listProductionStepTemplates(productName, sku);
  return NextResponse.json({ steps });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const productName = String(body.productName || "").trim();
  const sku = String(body.sku || "").trim();
  const labelsRaw = body.labels;
  if (!productName || !sku) {
    return NextResponse.json({ message: "Missing productName or sku" }, { status: 400 });
  }
  if (!Array.isArray(labelsRaw)) {
    return NextResponse.json({ message: "labels must be an array" }, { status: 400 });
  }
  const labels = labelsRaw.map((x) => String(x ?? ""));

  const exists = await productExistsByNameAndSku(productName, sku);
  if (!exists) {
    return NextResponse.json(
      { message: "No product row with this product name and SKU" },
      { status: 400 },
    );
  }

  try {
    await replaceProductionStepTemplates(productName, sku, labels);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Replace failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }

  await createAdminAuditLog({
    actorUsername: session.username,
    action: "replace_production_templates",
    targetUsername: session.username,
    details: `product=${productName}; sku=${sku}; steps=${labels.filter((l) => l.trim()).length}`,
  });

  const steps = await listProductionStepTemplates(productName, sku);
  return NextResponse.json({ ok: true, steps });
}
