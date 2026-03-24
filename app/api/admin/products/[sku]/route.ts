import { NextResponse } from "next/server";

import { createAdminAuditLog, updateProduct } from "@/lib/repositories";
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
  const body = await request.json();
  const productName = String(body.productName || "").trim();
  const variant = String(body.variant || "").trim();
  const articleNumber = String(body.articleNumber || "").trim();
  const unitCost = Number(body.unitCost || 0);
  const isActive = Boolean(body.isActive);

  if (!sku || !productName || !variant || !articleNumber || unitCost < 0) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  await updateProduct({
    sku,
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
    details: `product=${productName}; sku=${sku}; isActive=${isActive}`,
  });

  return NextResponse.json({ ok: true });
}
