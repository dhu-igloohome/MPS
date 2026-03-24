import { NextResponse } from "next/server";

import {
  createAdminAuditLog,
  findProductById,
  findProductBySkuAndVariant,
  isUppercaseSku,
  isValidVariant,
  updateProduct,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = {
  params: Promise<{ sku: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { sku } = await context.params;
  const id = sku;
  const body = await request.json();
  const nextSku = String(body.sku || "").trim();
  const productName = String(body.productName || "").trim();
  const variant = String(body.variant || "").trim();
  const articleNumber = String(body.articleNumber || "").trim();
  const unitCostRaw = Number(body.unitCost);
  const unitCost = Number.isFinite(unitCostRaw) && unitCostRaw >= 0 ? unitCostRaw : 0;
  const isActive = Boolean(body.isActive);

  if (!id || !nextSku || !productName || !variant) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }
  if (!isUppercaseSku(nextSku)) {
    return NextResponse.json(
      { message: "SKU must be uppercase letters only, or uppercase letters with numbers." },
      { status: 400 },
    );
  }
  if (!isValidVariant(variant)) {
    return NextResponse.json(
      { message: "Variant must be numbers only, or numbers followed by uppercase letters." },
      { status: 400 },
    );
  }

  const current = await findProductById(id);
  if (!current) {
    return NextResponse.json({ message: "Product not found" }, { status: 404 });
  }
  const duplicate = await findProductBySkuAndVariant(nextSku, variant);
  if (duplicate && duplicate.id !== current.id) {
    return NextResponse.json(
      { message: "Duplicate SKU and Variant is not allowed." },
      { status: 400 },
    );
  }

  await updateProduct({
    id,
    sku: nextSku,
    productName,
    variant,
    articleNumber,
    unitCost,
    isActive,
  });

  await createAdminAuditLog({
    actorUsername: session.username,
    action: "update_product",
    targetUsername: session.username,
    details: `product=${productName}; sku=${nextSku}; isActive=${isActive}`,
  });

  return NextResponse.json({ ok: true });
}
