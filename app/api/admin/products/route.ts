import { NextResponse } from "next/server";

import {
  createAdminAuditLog,
  createProduct,
  findProductBySkuAndVariant,
  isUppercaseSku,
  listProducts,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const products = await listProducts();
  return NextResponse.json({ products });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const productName = String(body.productName || "").trim();
  const sku = String(body.sku || "").trim();
  const variant = String(body.variant || "").trim();
  const articleNumber = String(body.articleNumber || "").trim();
  const unitCost = Number(body.unitCost || 0);

  if (!productName || !sku || !variant || !articleNumber || unitCost < 0) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }
  if (!isUppercaseSku(sku)) {
    return NextResponse.json(
      { message: "SKU must be uppercase letters only, or uppercase letters with numbers." },
      { status: 400 },
    );
  }
  const duplicate = await findProductBySkuAndVariant(sku, variant);
  if (duplicate) {
    return NextResponse.json(
      { message: "Duplicate SKU and Variant is not allowed." },
      { status: 400 },
    );
  }

  try {
    await createProduct({ productName, sku, variant, articleNumber, unitCost });
    await createAdminAuditLog({
      actorUsername: session.username,
      action: "create_product",
      targetUsername: session.username,
      details: `product=${productName}; sku=${sku}`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Create product failed" }, { status: 400 });
  }
}
