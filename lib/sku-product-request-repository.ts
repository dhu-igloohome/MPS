import { ensureDatabase, getSql } from "@/lib/db";
import { isUppercaseSku, isValidVariant } from "@/lib/product-sku-rules";
import type { SkuProductRequest, SkuProductRequestStatus } from "@/lib/types";

type SkuProductRequestRow = {
  id: number;
  product_name: string;
  sku: string;
  variant: string;
  article_number: string;
  unit_cost: string;
  request_note: string;
  status: SkuProductRequestStatus;
  requested_by: string;
  requested_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string;
  created_product_id: number | null;
};

function mapRow(row: SkuProductRequestRow): SkuProductRequest {
  return {
    id: String(row.id),
    productName: row.product_name,
    sku: row.sku,
    variant: row.variant,
    articleNumber: row.article_number,
    unitCost: Number(row.unit_cost),
    requestNote: row.request_note,
    status: row.status,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewComment: row.review_comment,
    createdProductId: row.created_product_id != null ? String(row.created_product_id) : null,
  };
}

export function normalizeSkuProductRequestInput(input: {
  productName: string;
  sku: string;
  variant: string;
}): { ok: true; productName: string; sku: string; variant: string } | { ok: false; message: string } {
  const productName = input.productName.trim();
  const sku = input.sku.trim().toUpperCase();
  let variant = input.variant.trim().toUpperCase();
  if (!variant) variant = "1";
  if (!productName) return { ok: false, message: "Product name is required" };
  if (!sku) return { ok: false, message: "SKU is required" };
  if (!isUppercaseSku(sku)) {
    return {
      ok: false,
      message: "SKU must be uppercase letters only, or uppercase letters with numbers",
    };
  }
  if (!isValidVariant(variant)) {
    return {
      ok: false,
      message: "Variant must be numbers only, or numbers followed by uppercase letters (e.g. 1)",
    };
  }
  return { ok: true, productName, sku, variant };
}

export async function listSkuProductRequests(options?: {
  status?: SkuProductRequestStatus;
}): Promise<SkuProductRequest[]> {
  await ensureDatabase();
  const db = getSql();
  const status = options?.status;
  const rows = status
    ? await db<SkuProductRequestRow[]>`
        select *
        from sku_product_requests
        where status = ${status}
        order by requested_at desc, id desc;
      `
    : await db<SkuProductRequestRow[]>`
        select *
        from sku_product_requests
        order by requested_at desc, id desc
        limit 500;
      `;
  return rows.map(mapRow);
}

export async function listPendingSkuProductRequests(): Promise<SkuProductRequest[]> {
  return listSkuProductRequests({ status: "pending" });
}

export async function skuProductRequestPendingExists(sku: string): Promise<boolean> {
  const sk = sku.trim();
  if (!sk) return false;
  await ensureDatabase();
  const db = getSql();
  const rows = await db<{ exists: boolean }[]>`
    select exists(
      select 1 from sku_product_requests
      where lower(trim(sku)) = lower(${sk}) and status = 'pending'
      limit 1
    ) as exists;
  `;
  return Boolean(rows[0]?.exists);
}

export async function activeProductExistsForSku(sku: string): Promise<boolean> {
  const sk = sku.trim();
  if (!sk) return false;
  await ensureDatabase();
  const db = getSql();
  const rows = await db<{ exists: boolean }[]>`
    select exists(
      select 1 from products
      where lower(trim(sku)) = lower(${sk}) and is_active = true
      limit 1
    ) as exists;
  `;
  return Boolean(rows[0]?.exists);
}

export async function createSkuProductRequest(input: {
  productName: string;
  sku: string;
  variant: string;
  articleNumber?: string;
  unitCost?: number;
  requestNote?: string;
  requestedBy: string;
}): Promise<SkuProductRequest> {
  const parsed = normalizeSkuProductRequestInput(input);
  if (!parsed.ok) throw new Error(parsed.message);

  if (await activeProductExistsForSku(parsed.sku)) {
    throw new Error("This SKU already exists in the product database");
  }
  if (await skuProductRequestPendingExists(parsed.sku)) {
    throw new Error("A pending request already exists for this SKU");
  }

  const { findProductBySkuAndVariant } = await import("@/lib/repositories");
  const existing = await findProductBySkuAndVariant(parsed.sku, parsed.variant);
  if (existing?.isActive) {
    throw new Error("This SKU and variant already exist in the product database");
  }

  await ensureDatabase();
  const db = getSql();
  const unitCost = Number.isFinite(input.unitCost) && input.unitCost! >= 0 ? input.unitCost! : 0;
  const rows = await db<SkuProductRequestRow[]>`
    insert into sku_product_requests (
      product_name,
      sku,
      variant,
      article_number,
      unit_cost,
      request_note,
      requested_by
    )
    values (
      ${parsed.productName},
      ${parsed.sku},
      ${parsed.variant},
      ${String(input.articleNumber ?? "").trim()},
      ${unitCost},
      ${String(input.requestNote ?? "").trim()},
      ${input.requestedBy}
    )
    returning *;
  `;
  return mapRow(rows[0]);
}

export async function getSkuProductRequestById(id: string): Promise<SkuProductRequest | null> {
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum < 1) return null;
  await ensureDatabase();
  const db = getSql();
  const rows = await db<SkuProductRequestRow[]>`
    select * from sku_product_requests where id = ${idNum} limit 1;
  `;
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function approveSkuProductRequest(
  id: string,
  reviewerUsername: string,
): Promise<SkuProductRequest> {
  const { createProduct, createAdminAuditLog, findProductBySkuAndVariant } = await import(
    "@/lib/repositories"
  );

  const req = await getSkuProductRequestById(id);
  if (!req) throw new Error("Request not found");
  if (req.status !== "pending") throw new Error("Request is not pending");

  const existing = await findProductBySkuAndVariant(req.sku, req.variant);
  let productId: string | null = existing?.id ?? null;
  if (!existing) {
    await createProduct({
      productName: req.productName,
      sku: req.sku,
      variant: req.variant,
      unitCost: req.unitCost,
      articleNumber: req.articleNumber,
    });
    const created = await findProductBySkuAndVariant(req.sku, req.variant);
    productId = created?.id ?? null;
  } else if (!existing.isActive) {
    await ensureDatabase();
    const db = getSql();
    await db`
      update products
      set
        product_name = ${req.productName},
        is_active = true,
        unit_cost = ${req.unitCost},
        article_number = ${req.articleNumber}
      where id = ${Number(existing.id)};
    `;
    productId = existing.id;
  }

  await ensureDatabase();
  const db = getSql();
  const rows = await db<SkuProductRequestRow[]>`
    update sku_product_requests
    set
      status = 'approved',
      reviewed_by = ${reviewerUsername},
      reviewed_at = now(),
      created_product_id = ${productId ? Number(productId) : null}
    where id = ${Number(req.id)}
    returning *;
  `;

  await createAdminAuditLog({
    actorUsername: reviewerUsername,
    action: "approve_sku_product_request",
    targetUsername: req.requestedBy,
    details: `sku=${req.sku}; variant=${req.variant}; product=${req.productName}`,
  });

  return mapRow(rows[0]);
}

export async function rejectSkuProductRequest(
  id: string,
  reviewerUsername: string,
  reviewComment: string,
): Promise<SkuProductRequest> {
  const { createAdminAuditLog } = await import("@/lib/repositories");

  const req = await getSkuProductRequestById(id);
  if (!req) throw new Error("Request not found");
  if (req.status !== "pending") throw new Error("Request is not pending");

  const comment = reviewComment.trim();
  if (!comment) throw new Error("Rejection comment is required");

  await ensureDatabase();
  const db = getSql();
  const rows = await db<SkuProductRequestRow[]>`
    update sku_product_requests
    set
      status = 'rejected',
      reviewed_by = ${reviewerUsername},
      reviewed_at = now(),
      review_comment = ${comment}
    where id = ${Number(req.id)}
    returning *;
  `;

  await createAdminAuditLog({
    actorUsername: reviewerUsername,
    action: "reject_sku_product_request",
    targetUsername: req.requestedBy,
    details: `sku=${req.sku}; comment=${comment.slice(0, 200)}`,
  });

  return mapRow(rows[0]);
}
