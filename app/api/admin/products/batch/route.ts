import { NextResponse } from "next/server";

import { createAdminAuditLog, isUppercaseSku, upsertProductsBulk } from "@/lib/repositories";
import { getSession } from "@/lib/session";

type BatchProductInput = {
  productName: string;
  sku: string;
  variant: string;
  unitCost: number;
  articleNumber: string;
};

function isValidItem(item: BatchProductInput) {
  return (
    Boolean(item.productName?.trim()) &&
    Boolean(item.sku?.trim()) &&
    isUppercaseSku(item.sku.trim()) &&
    Boolean(item.variant?.trim()) &&
    Number.isFinite(item.unitCost) &&
    item.unitCost >= 0
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const items = Array.isArray(body.items) ? (body.items as BatchProductInput[]) : [];
  if (items.length === 0) {
    return NextResponse.json({ message: "No rows uploaded" }, { status: 400 });
  }

  const sanitized: BatchProductInput[] = items
    .map((item) => ({
      productName: String(item.productName || "").trim(),
      sku: String(item.sku || "").trim(),
      variant: String(item.variant || "").trim(),
      unitCost: Number.isFinite(Number(item.unitCost)) ? Number(item.unitCost) : 0,
      articleNumber: String(item.articleNumber || "").trim(),
    }))
    .filter(isValidItem);

  if (sanitized.length === 0) {
    return NextResponse.json({ message: "All rows are invalid" }, { status: 400 });
  }

  await upsertProductsBulk(sanitized);
  await createAdminAuditLog({
    actorUsername: session.username,
    action: "batch_upsert_products",
    targetUsername: session.username,
    details: `count=${sanitized.length}`,
  });

  return NextResponse.json({ ok: true, count: sanitized.length });
}
