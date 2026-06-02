import { getSql } from "@/lib/db";

let skuTableReady = false;

/**
 * Create SKU request table/indexes on demand (never blocks global schema bootstrap).
 * Returns false if DDL failed (callers should treat SKU requests as unavailable).
 */
export async function ensureSkuProductRequestsTable(): Promise<boolean> {
  if (skuTableReady) return true;
  try {
    const db = getSql();
    await db`
      create table if not exists sku_product_requests (
        id bigserial primary key,
        product_name text not null,
        sku text not null,
        variant text not null default '1',
        article_number text not null default '',
        unit_cost numeric(12, 2) not null default 0,
        request_note text not null default '',
        status text not null default 'pending'
          check (status in ('pending', 'approved', 'rejected')),
        requested_by text not null references users(username),
        requested_at timestamptz not null default now(),
        reviewed_by text references users(username),
        reviewed_at timestamptz,
        review_comment text not null default '',
        created_product_id bigint references products(id) on delete set null
      );
    `;
    await db`
      create index if not exists idx_sku_product_requests_status
      on sku_product_requests (status, requested_at desc);
    `;
    await db`
      delete from sku_product_requests a
      using sku_product_requests b
      where a.id > b.id
        and a.status = 'pending'
        and b.status = 'pending'
        and lower(trim(a.sku)) = lower(trim(b.sku));
    `;
    await db`
      create unique index if not exists idx_sku_product_requests_pending_sku
      on sku_product_requests (lower(trim(sku)))
      where status = 'pending';
    `;
    skuTableReady = true;
    return true;
  } catch (err) {
    console.error("[ensureSkuProductRequestsTable]", err);
    return false;
  }
}
