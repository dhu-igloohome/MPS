import { ensureDatabase, getSql } from "@/lib/db";
import { forecastPoPrefixForRegion, singaporeYmdCompact } from "@/lib/forecast-po";
import type { ParsedOrderProgressDeliveryPlan } from "@/lib/order-progress-delivery-plans";
import { hashPassword, verifyPassword } from "@/lib/security";
import {
  AdminAuditLog,
  AdminUser,
  ForecastEntry,
  LogisticsLocation,
  LogisticsMovementType,
  LogisticsShipmentEntry,
  LogisticsShipmentStatus,
  ContractEntry,
  ContractStatus,
  OrderProductionStep,
  OrderProgressDeliveryPlan,
  ProductionStepTemplateEntry,
  OrderProgressEntry,
  OrderProgressOrderType,
  OrderProgressRegion,
  OrderProgressStatus,
  OrderProgressDeletionLog,
  ProductItem,
  Region,
  SessionPayload,
  SupplierEntry,
  UserRole,
} from "@/lib/types";

type UserRow = {
  username: string;
  password_hash: string;
  display_name: string;
  role: SessionPayload["role"];
};

type RegionRow = {
  region: Region;
};

type AdminUserRow = {
  username: string;
  display_name: string;
  role: UserRole;
  created_at: string;
  region: Region | null;
};

type AdminAuditLogRow = {
  id: number;
  actor_username: string;
  action: string;
  target_username: string;
  details: string;
  created_at: string;
};

type ProductRow = {
  id: number;
  product_name: string;
  sku: string;
  variant: string;
  unit_cost: string | number;
  article_number: string;
  is_active: boolean;
  created_at: string;
};

type OrderProgressRow = {
  id: number;
  order_number: string;
  product_name: string;
  sku: string;
  quantity: number;
  order_date: string;
  delivery_date: string;
  order_type: OrderProgressOrderType;
  progress: OrderProgressStatus;
  factory_name: string;
  region: OrderProgressRegion;
  created_by: string;
  created_at: string;
  updated_at: string;
  po_number: string | null;
  po_batch: string;
  unit_cost_snapshot: string | number;
  po_delivery_date: string | null;
  po_serial_code: string;
  po_bluetooth_id: string;
};

type OrderProgressDeliveryPlanRow = {
  id: number;
  order_progress_id: number;
  expected_delivery_date: string;
  quantity: number;
  progress: OrderProgressStatus;
  sort_order: number;
  created_at: string;
};

type OrderProgressDeletionLogRow = {
  id: number;
  order_progress_id: number;
  order_number: string;
  forecast_number: string;
  sku: string;
  region: OrderProgressRegion;
  reason: string;
  deleted_by: string;
  deleted_at: string;
};

type OrderProductionStepRow = {
  id: number;
  order_progress_id: number;
  sort_order: number;
  label: string;
  done: boolean;
  completed_at: string | null;
  completed_by: string | null;
};

type SupplierRow = {
  id: number;
  name: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  created_at: string;
  updated_at: string;
};

type ContractRow = {
  id: number;
  order_progress_id: number;
  supplier_id: number;
  supplier_name: string;
  po_number: string;
  signed_date: string;
  sku: string;
  product_name: string;
  batch: string;
  quantity: number;
  unit_cost: string | number;
  total_amount: string | number;
  delivery_date: string;
  currency: string;
  payment_terms: string;
  quality_remarks: string;
  delivery_address: string;
  serial_code: string;
  bluetooth_id: string;
  status: ContractStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
};

const MAX_PRODUCTION_TEMPLATE_STEPS = 40;
const MAX_PRODUCTION_STEP_LABEL_LEN = 200;

export function orderProgressRegionsForSession(regions: Region[]): OrderProgressRegion[] {
  const set = new Set<OrderProgressRegion>();
  for (const r of regions) {
    if (r === "USA") {
      set.add("US");
    } else if (r === "APAC" || r === "EU") {
      set.add(r);
    }
  }
  return Array.from(set);
}

export function sessionCanAccessOrderProgressRegion(
  sessionRegions: Region[],
  rowRegion: OrderProgressRegion,
): boolean {
  return orderProgressRegionsForSession(sessionRegions).includes(rowRegion);
}

export function isUppercaseSku(input: string) {
  return /^[A-Z][A-Z0-9]*$/.test(input);
}

export function isValidVariant(input: string) {
  return /^[0-9]+[A-Z]*$/.test(input);
}

export async function authenticateUser(username: string, password: string) {
  await ensureDatabase();
  const db = getSql();
  const users = await db<UserRow[]>`
    select username, password_hash, display_name, role
    from users
    where username = ${username}
    limit 1;
  `;

  const user = users[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return null;
  }

  const regions = await db<RegionRow[]>`
    select region
    from user_regions
    where username = ${username}
    order by region;
  `;

  return {
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    regions: regions.map((item) => item.region),
  } satisfies SessionPayload;
}

export async function createForecast(input: {
  month: string;
  region: Region;
  destination: string;
  poNumber?: string;
  productName: string;
  sku: string;
  remark: string;
  buildToOrder: number;
  buildToStock: number;
  createdBy: string;
}) {
  await ensureDatabase();
  const db = getSql();
  const manualPo = String(input.poNumber || "").trim();
  if (manualPo) {
    const rows = await db<
      {
        id: number;
        forecast_month: string;
        region: Region;
        destination: string;
        po_number: string;
        product_name: string;
        sku: string;
        remark: string;
        build_to_order: number;
        build_to_stock: number;
        created_by: string;
        created_at: string;
      }[]
    >`
      insert into forecasts (
        forecast_month,
        region,
        destination,
        po_number,
        product_name,
        sku,
        remark,
        build_to_order,
        build_to_stock,
        created_by
      )
      values (
        ${input.month},
        ${input.region},
        ${input.destination.trim()},
        ${manualPo},
        ${input.productName.trim()},
        ${input.sku.trim()},
        ${input.remark.trim()},
        ${input.buildToOrder},
        ${input.buildToStock},
        ${input.createdBy}
      )
      returning
        id,
        forecast_month,
        region,
        destination,
        po_number,
        product_name,
        sku,
        remark,
        build_to_order,
        build_to_stock,
        created_by,
        created_at::text;
    `;
    return mapForecast(rows[0]);
  }
  const prefix = forecastPoPrefixForRegion(input.region);
  const ymd = singaporeYmdCompact();
  const bucket = `${prefix}-${ymd}`;
  const rows = await db<
    {
      id: number;
      forecast_month: string;
      region: Region;
      destination: string;
      po_number: string;
      product_name: string;
      sku: string;
      remark: string;
      build_to_order: number;
      build_to_stock: number;
      created_by: string;
      created_at: string;
    }[]
  >`
    with alloc as (
      insert into forecast_po_sequences (bucket, next_number)
      values (${bucket}, 1)
      on conflict (bucket) do update
      set next_number = forecast_po_sequences.next_number + 1
      returning next_number as seq_num
    )
    insert into forecasts (
      forecast_month,
      region,
      destination,
      po_number,
      product_name,
      sku,
      remark,
      build_to_order,
      build_to_stock,
      created_by
    )
    select
      ${input.month},
      ${input.region},
      ${input.destination.trim()},
      ${prefix + ymd} || lpad(alloc.seq_num::text, 4, '0'),
      ${input.productName.trim()},
      ${input.sku.trim()},
      ${input.remark.trim()},
      ${input.buildToOrder},
      ${input.buildToStock},
      ${input.createdBy}
    from alloc
    returning
      id,
      forecast_month,
      region,
      destination,
      po_number,
      product_name,
      sku,
      remark,
      build_to_order,
      build_to_stock,
      created_by,
      created_at::text;
  `;

  return mapForecast(rows[0]);
}

export async function listActiveProducts() {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ProductRow[]>`
    select
      id,
      product_name,
      sku,
      variant,
      unit_cost::text,
      article_number,
      is_active,
      created_at::text
    from products
    where is_active = true
    order by product_name asc, sku asc;
  `;
  return rows.map(mapProduct);
}

export async function findProductBySkuAndVariant(sku: string, variant: string) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ProductRow[]>`
    select
      id,
      product_name,
      sku,
      variant,
      unit_cost::text,
      article_number,
      is_active,
      created_at::text
    from products
    where sku = ${sku} and variant = ${variant}
    limit 1;
  `;
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function findProductById(id: string) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ProductRow[]>`
    select
      id,
      product_name,
      sku,
      variant,
      unit_cost::text,
      article_number,
      is_active,
      created_at::text
    from products
    where id = ${Number(id)}
    limit 1;
  `;
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function productExistsByNameAndSku(productName: string, sku: string): Promise<boolean> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<{ ok: number }[]>`
    select 1 as ok
    from products
    where product_name = ${productName.trim()} and sku = ${sku.trim()}
    limit 1;
  `;
  return rows.length > 0;
}

export async function findActiveProductByNameAndSku(productName: string, sku: string) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ProductRow[]>`
    select
      id,
      product_name,
      sku,
      variant,
      unit_cost::text,
      article_number,
      is_active,
      created_at::text
    from products
    where is_active = true and product_name = ${productName} and sku = ${sku}
    limit 1;
  `;
  return rows[0] ? mapProduct(rows[0]) : null;
}

export async function getActiveUnitCostByProductNameAndSku(
  productName: string,
  sku: string,
): Promise<number | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<{ unit_cost: string }[]>`
    select unit_cost::text as unit_cost
    from products
    where is_active = true and product_name = ${productName.trim()} and sku = ${sku.trim()}
    order by id asc
    limit 1;
  `;
  if (!rows[0]) return null;
  const n = Number(rows[0].unit_cost);
  return Number.isFinite(n) ? n : 0;
}

export async function getForecastsByRegions(regions: Region[]) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<
    {
      id: number;
      forecast_month: string;
      region: Region;
      destination: string;
      po_number: string;
      product_name: string;
      sku: string;
      remark: string;
      build_to_order: number;
      build_to_stock: number;
      created_by: string;
      created_at: string;
    }[]
  >`
    select
      id,
      forecast_month,
      region,
      destination,
      po_number,
      product_name,
      sku,
      remark,
      build_to_order,
      build_to_stock,
      created_by,
      created_at::text
    from forecasts
    where region = any(${regions})
    order by created_at desc
    limit 200;
  `;

  return rows.map(mapForecast);
}

export async function findLatestForecastByPoAndSku(
  sessionRegions: Region[],
  poNumber: string,
  sku: string,
): Promise<ForecastEntry | null> {
  const po = poNumber.trim();
  const sk = sku.trim();
  if (!po || !sk) return null;
  await ensureDatabase();
  const db = getSql();
  const rows = await db<
    {
      id: number;
      forecast_month: string;
      region: Region;
      destination: string;
      po_number: string;
      product_name: string;
      sku: string;
      remark: string;
      build_to_order: number;
      build_to_stock: number;
      created_by: string;
      created_at: string;
    }[]
  >`
    select
      id,
      forecast_month,
      region,
      destination,
      po_number,
      product_name,
      sku,
      remark,
      build_to_order,
      build_to_stock,
      created_by,
      created_at::text
    from forecasts
    where region = any(${sessionRegions}) and po_number = ${po} and sku = ${sk}
    order by created_at desc
    limit 1;
  `;
  return rows[0] ? mapForecast(rows[0]) : null;
}

export async function forecastPoExistsInRegion(region: Region, poNumber: string): Promise<boolean> {
  await ensureDatabase();
  const db = getSql();
  const po = poNumber.trim();
  if (!po) return false;
  const rows = await db<{ ok: number }[]>`
    select 1 as ok
    from forecasts
    where region = ${region} and po_number = ${po}
    limit 1;
  `;
  return rows.length > 0;
}

export async function getForecastById(id: string): Promise<ForecastEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<
    {
      id: number;
      forecast_month: string;
      region: Region;
      destination: string;
      po_number: string;
      product_name: string;
      sku: string;
      remark: string;
      build_to_order: number;
      build_to_stock: number;
      created_by: string;
      created_at: string;
    }[]
  >`
    select
      id,
      forecast_month,
      region,
      destination,
      po_number,
      product_name,
      sku,
      remark,
      build_to_order,
      build_to_stock,
      created_by,
      created_at::text
    from forecasts
    where id = ${Number(id)}
    limit 1;
  `;
  return rows[0] ? mapForecast(rows[0]) : null;
}

export async function deleteForecastById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`
    delete from forecasts
    where id = ${Number(id)};
  `;
}

export async function createForecastDeletionLog(input: {
  forecastId: string;
  poNumber: string;
  sku: string;
  region: Region;
  reason: string;
  deletedBy: string;
}): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`
    insert into forecast_deletion_logs (
      forecast_id,
      po_number,
      sku,
      region,
      reason,
      deleted_by
    )
    values (
      ${Number(input.forecastId)},
      ${input.poNumber},
      ${input.sku},
      ${input.region},
      ${input.reason.trim()},
      ${input.deletedBy}
    );
  `;
}

export async function forecastPoSkuExistsInRegions(
  regions: Region[],
  poNumber: string,
  sku: string,
): Promise<boolean> {
  await ensureDatabase();
  const db = getSql();
  const po = poNumber.trim();
  const sk = sku.trim();
  if (!po || !sk || regions.length === 0) return false;
  const rows = await db<{ ok: number }[]>`
    select 1 as ok
    from forecasts
    where region = any(${regions}) and po_number = ${po} and sku = ${sk}
    limit 1;
  `;
  return rows.length > 0;
}

export async function getSummaryByMonthAndRegion(regions: Region[]) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<
    {
      month: string;
      region: Region;
      build_to_order: number;
      build_to_stock: number;
    }[]
  >`
    select
      forecast_month as month,
      region,
      sum(build_to_order) as build_to_order,
      sum(build_to_stock) as build_to_stock
    from forecasts
    where region = any(${regions})
    group by forecast_month, region
    order by forecast_month desc, region asc;
  `;

  return rows.map((row) => ({
    month: row.month,
    region: row.region,
    buildToOrder: Number(row.build_to_order || 0),
    buildToStock: Number(row.build_to_stock || 0),
  }));
}

export async function getSummaryByQuarterAndRegion(regions: Region[]) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<
    {
      quarter: string;
      region: Region;
      build_to_order: number;
      build_to_stock: number;
      sku_count: number;
    }[]
  >`
    select
      concat(
        split_part(forecast_month, '-', 1),
        '-Q',
        (((split_part(forecast_month, '-', 2)::int - 1) / 3) + 1)::int
      ) as quarter,
      region,
      sum(build_to_order) as build_to_order,
      sum(build_to_stock) as build_to_stock,
      count(distinct sku) as sku_count
    from forecasts
    where region = any(${regions})
    group by
      split_part(forecast_month, '-', 1),
      (((split_part(forecast_month, '-', 2)::int - 1) / 3) + 1)::int,
      region
    order by
      split_part(forecast_month, '-', 1) desc,
      (((split_part(forecast_month, '-', 2)::int - 1) / 3) + 1)::int desc,
      region asc;
  `;

  return rows.map((row) => ({
    quarter: row.quarter,
    region: row.region,
    buildToOrder: Number(row.build_to_order || 0),
    buildToStock: Number(row.build_to_stock || 0),
    skuCount: Number(row.sku_count || 0),
  }));
}

function mapForecast(row: {
  id: number;
  forecast_month: string;
  region: Region;
  destination: string;
  po_number: string;
  product_name: string;
  sku: string;
  remark: string;
  build_to_order: number;
  build_to_stock: number;
  created_by: string;
  created_at: string;
}): ForecastEntry {
  return {
    id: String(row.id),
    month: row.forecast_month,
    region: row.region,
    destination: row.destination || "",
    poNumber: row.po_number || "",
    productName: row.product_name,
    sku: row.sku,
    remark: row.remark || "",
    buildToOrder: Number(row.build_to_order || 0),
    buildToStock: Number(row.build_to_stock || 0),
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

export async function listUsersWithRegions() {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<AdminUserRow[]>`
    select
      u.username,
      u.display_name,
      u.role,
      u.created_at::text,
      ur.region
    from users u
    left join user_regions ur on ur.username = u.username
    order by u.created_at asc, ur.region asc;
  `;

  const map = new Map<string, AdminUser>();
  for (const row of rows) {
    const current = map.get(row.username) || {
      username: row.username,
      displayName: row.display_name,
      role: row.role,
      regions: [],
      createdAt: row.created_at,
    };
    if (row.region && !current.regions.includes(row.region)) {
      current.regions.push(row.region);
    }
    map.set(row.username, current);
  }

  return [...map.values()];
}

export async function createUserAccount(input: {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  regions: Region[];
}) {
  await ensureDatabase();
  const db = getSql();
  await db`
    insert into users (username, password_hash, display_name, role)
    values (
      ${input.username},
      ${hashPassword(input.password)},
      ${input.displayName},
      ${input.role}
    );
  `;

  for (const region of input.regions) {
    await db`
      insert into user_regions (username, region)
      values (${input.username}, ${region});
    `;
  }
}

export async function updateUserRegionsAndRole(input: {
  username: string;
  role: UserRole;
  regions: Region[];
}) {
  await ensureDatabase();
  const db = getSql();
  await db`
    update users
    set role = ${input.role}
    where username = ${input.username};
  `;

  await db`
    delete from user_regions
    where username = ${input.username};
  `;

  for (const region of input.regions) {
    await db`
      insert into user_regions (username, region)
      values (${input.username}, ${region});
    `;
  }
}

export async function resetUserPassword(username: string, password: string) {
  await ensureDatabase();
  const db = getSql();
  await db`
    update users
    set password_hash = ${hashPassword(password)}
    where username = ${username};
  `;
}

export async function deleteUserAccount(username: string) {
  await ensureDatabase();
  const db = getSql();
  await db`
    delete from users
    where username = ${username};
  `;
}

export async function createAdminAuditLog(input: {
  actorUsername: string;
  action: string;
  targetUsername: string;
  details?: string;
}) {
  await ensureDatabase();
  const db = getSql();
  await db`
    insert into admin_audit_logs (actor_username, action, target_username, details)
    values (${input.actorUsername}, ${input.action}, ${input.targetUsername}, ${input.details || ""});
  `;
}

export async function listAdminAuditLogs(limit = 50) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<AdminAuditLogRow[]>`
    select id, actor_username, action, target_username, details, created_at::text
    from admin_audit_logs
    order by created_at desc
    limit ${limit};
  `;

  return rows.map(
    (row): AdminAuditLog => ({
      id: String(row.id),
      actorUsername: row.actor_username,
      action: row.action,
      targetUsername: row.target_username,
      details: row.details,
      createdAt: row.created_at,
    }),
  );
}

export async function listProducts(limit = 500) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ProductRow[]>`
    select
      id,
      product_name,
      sku,
      variant,
      unit_cost::text,
      article_number,
      is_active,
      created_at::text
    from products
    order by created_at desc
    limit ${limit};
  `;
  return rows.map(mapProduct);
}

export async function createProduct(input: {
  productName: string;
  sku: string;
  variant: string;
  unitCost: number;
  articleNumber: string;
}) {
  await ensureDatabase();
  const db = getSql();
  await db`
    insert into products (product_name, sku, variant, unit_cost, article_number, is_active)
    values (
      ${input.productName.trim()},
      ${input.sku.trim()},
      ${input.variant.trim()},
      ${input.unitCost},
      ${input.articleNumber.trim()},
      true
    );
  `;
}

export async function upsertProductsBulk(
  items: Array<{
    productName: string;
    sku: string;
    variant: string;
    unitCost: number;
    articleNumber: string;
  }>,
) {
  await ensureDatabase();
  const db = getSql();

  for (const item of items) {
    await db`
      insert into products (product_name, sku, variant, unit_cost, article_number, is_active)
      values (
        ${item.productName.trim()},
        ${item.sku.trim()},
        ${item.variant.trim()},
        ${item.unitCost},
        ${item.articleNumber.trim()},
        true
      )
      on conflict (sku, variant) do update
      set
        product_name = excluded.product_name,
        unit_cost = excluded.unit_cost,
        article_number = excluded.article_number,
        is_active = true;
    `;
  }
}

export async function updateProduct(input: {
  id: string;
  sku: string;
  productName: string;
  variant: string;
  unitCost: number;
  articleNumber: string;
  isActive: boolean;
}) {
  await ensureDatabase();
  const db = getSql();
  await db`
    update products
    set
      sku = ${input.sku.trim()},
      product_name = ${input.productName.trim()},
      variant = ${input.variant.trim()},
      unit_cost = ${input.unitCost},
      article_number = ${input.articleNumber.trim()},
      is_active = ${input.isActive}
    where id = ${Number(input.id)};
  `;
}

export async function deleteProductById(id: string) {
  await ensureDatabase();
  const db = getSql();
  await db`
    delete from products
    where id = ${Number(id)};
  `;
}

function formatPgDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function mapDeliveryPlanRow(row: OrderProgressDeliveryPlanRow): OrderProgressDeliveryPlan {
  return {
    id: String(row.id),
    expectedDeliveryDate: formatPgDateOnly(row.expected_delivery_date),
    quantity: Number(row.quantity ?? 0),
    progress: row.progress,
  };
}

function mapOrderProductionStepRow(row: OrderProductionStepRow): OrderProductionStep {
  return {
    id: String(row.id),
    sortOrder: Number(row.sort_order ?? 0),
    label: row.label || "",
    done: Boolean(row.done),
    completedAt: row.completed_at ? String(row.completed_at) : null,
    completedBy: row.completed_by || null,
  };
}

function mapOrderProgress(
  row: OrderProgressRow,
  deliveryPlans: OrderProgressDeliveryPlan[],
  productionSteps: OrderProductionStep[],
): OrderProgressEntry {
  return {
    id: String(row.id),
    orderNumber: row.order_number ?? "",
    productName: row.product_name,
    sku: row.sku,
    quantity: Number(row.quantity ?? 0),
    orderDate: formatPgDateOnly(row.order_date),
    expectedDeliveryDate: formatPgDateOnly(row.delivery_date),
    orderType: row.order_type,
    progress: row.progress,
    factoryName: row.factory_name || "",
    region: row.region,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deliveryPlans,
    productionSteps,
    poNumber: row.po_number,
    poBatch: row.po_batch ?? "",
    unitCostSnapshot: Number(row.unit_cost_snapshot ?? 0),
    poDeliveryDate: row.po_delivery_date ? formatPgDateOnly(row.po_delivery_date) : null,
    poSerialCode: row.po_serial_code ?? "",
    poBluetoothId: row.po_bluetooth_id ?? "",
  };
}

async function loadOrderProductionStepsByIds(
  db: ReturnType<typeof getSql>,
  ids: number[],
): Promise<Map<number, OrderProductionStep[]>> {
  const map = new Map<number, OrderProductionStep[]>();
  if (ids.length === 0) {
    return map;
  }
  const rows = await db<OrderProductionStepRow[]>`
    select
      id,
      order_progress_id,
      sort_order,
      label,
      done,
      completed_at::text,
      completed_by
    from order_production_steps
    where order_progress_id = any(${ids})
    order by sort_order asc, id asc;
  `;
  for (const row of rows) {
    const oid = Number(row.order_progress_id);
    const list = map.get(oid) ?? [];
    list.push(mapOrderProductionStepRow(row));
    map.set(oid, list);
  }
  return map;
}

async function seedOrderProductionStepsFromTemplate(
  db: ReturnType<typeof getSql>,
  orderProgressId: number,
  productName: string,
  sku: string,
) {
  const templates = await db<{ sort_order: number; label: string }[]>`
    select sort_order, label
    from production_step_templates
    where product_name = ${productName.trim()} and sku = ${sku.trim()}
    order by sort_order asc, id asc;
  `;
  for (const t of templates) {
    await db`
      insert into order_production_steps (
        order_progress_id,
        sort_order,
        label,
        done
      )
      values (${orderProgressId}, ${t.sort_order}, ${t.label}, false);
    `;
  }
}

async function replaceOrderProductionStepsForOrder(
  db: ReturnType<typeof getSql>,
  orderProgressId: number,
  productName: string,
  sku: string,
) {
  await db`
    delete from order_production_steps
    where order_progress_id = ${orderProgressId};
  `;
  await seedOrderProductionStepsFromTemplate(db, orderProgressId, productName, sku);
}

async function ensureOrderProductionStepsLoaded(
  db: ReturnType<typeof getSql>,
  rows: OrderProgressRow[],
): Promise<Map<number, OrderProductionStep[]>> {
  const ids = rows.map((r) => Number(r.id));
  if (ids.length === 0) {
    return new Map();
  }
  let stepMap = await loadOrderProductionStepsByIds(db, ids);
  for (const row of rows) {
    const oid = Number(row.id);
    if ((stepMap.get(oid) ?? []).length === 0) {
      await seedOrderProductionStepsFromTemplate(db, oid, row.product_name, row.sku);
    }
  }
  stepMap = await loadOrderProductionStepsByIds(db, ids);
  return stepMap;
}

async function loadDeliveryPlansByProgressIds(
  db: ReturnType<typeof getSql>,
  ids: number[],
): Promise<Map<number, OrderProgressDeliveryPlan[]>> {
  const map = new Map<number, OrderProgressDeliveryPlan[]>();
  if (ids.length === 0) {
    return map;
  }
  const rows = await db<OrderProgressDeliveryPlanRow[]>`
    select
      id,
      order_progress_id,
      expected_delivery_date::text,
      quantity,
      progress,
      sort_order,
      created_at::text
    from order_progress_delivery_plans
    where order_progress_id = any(${ids})
    order by sort_order asc, id asc;
  `;
  for (const row of rows) {
    // postgres.js returns int8/bigserial as BigInt; Map keys must match Number(id) used on lookup.
    const progressId = Number(row.order_progress_id);
    const list = map.get(progressId) ?? [];
    list.push(mapDeliveryPlanRow(row));
    map.set(progressId, list);
  }
  return map;
}

async function replaceOrderProgressDeliveryPlans(
  db: ReturnType<typeof getSql>,
  orderProgressId: number,
  plans: ParsedOrderProgressDeliveryPlan[],
) {
  await db`
    delete from order_progress_delivery_plans
    where order_progress_id = ${orderProgressId};
  `;
  let sortOrder = 0;
  for (const p of plans) {
    await db`
      insert into order_progress_delivery_plans (
        order_progress_id,
        expected_delivery_date,
        quantity,
        progress,
        sort_order
      )
      values (
        ${orderProgressId},
        ${p.expectedDeliveryDate},
        ${p.quantity},
        ${p.progress},
        ${sortOrder}
      );
    `;
    sortOrder += 1;
  }
}

export async function listOrderProgressBySessionRegions(regions: Region[]) {
  await ensureDatabase();
  const db = getSql();
  const allowed = orderProgressRegionsForSession(regions);
  if (allowed.length === 0) {
    return [];
  }
  const rows = await db<OrderProgressRow[]>`
    select
      id,
      coalesce(order_number, '') as order_number,
      product_name,
      sku,
      quantity,
      order_date::text,
      delivery_date::text,
      order_type,
      progress,
      factory_name,
      region,
      created_by,
      created_at::text,
      updated_at::text,
      po_number,
      po_batch,
      unit_cost_snapshot::text,
      po_delivery_date::text,
      po_serial_code,
      po_bluetooth_id
    from order_progress
    where region = any(${allowed})
    order by updated_at desc, id desc
    limit 500;
  `;
  const planMap = await loadDeliveryPlansByProgressIds(
    db,
    rows.map((r) => Number(r.id)),
  );
  const stepMap = await ensureOrderProductionStepsLoaded(db, rows);
  return rows.map((row) => {
    const oid = Number(row.id);
    return mapOrderProgress(row, planMap.get(oid) ?? [], stepMap.get(oid) ?? []);
  });
}

export async function getOrderProgressById(id: string) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<OrderProgressRow[]>`
    select
      id,
      coalesce(order_number, '') as order_number,
      product_name,
      sku,
      quantity,
      order_date::text,
      delivery_date::text,
      order_type,
      progress,
      factory_name,
      region,
      created_by,
      created_at::text,
      updated_at::text,
      po_number,
      po_batch,
      unit_cost_snapshot::text,
      po_delivery_date::text,
      po_serial_code,
      po_bluetooth_id
    from order_progress
    where id = ${Number(id)}
    limit 1;
  `;
  if (!rows[0]) {
    return null;
  }
  const oid = Number(rows[0].id);
  const planMap = await loadDeliveryPlansByProgressIds(db, [oid]);
  let stepMap = await loadOrderProductionStepsByIds(db, [oid]);
  if ((stepMap.get(oid) ?? []).length === 0) {
    await seedOrderProductionStepsFromTemplate(db, oid, rows[0].product_name, rows[0].sku);
    stepMap = await loadOrderProductionStepsByIds(db, [oid]);
  }
  return mapOrderProgress(rows[0], planMap.get(oid) ?? [], stepMap.get(oid) ?? []);
}

export async function createOrderProgress(input: {
  poNumber: string;
  productName: string;
  sku: string;
  quantity: number;
  orderDate: string;
  expectedDeliveryDate: string;
  orderType: OrderProgressOrderType;
  progress: OrderProgressStatus;
  factoryName: string;
  region: OrderProgressRegion;
  createdBy: string;
  deliveryPlans: ParsedOrderProgressDeliveryPlan[];
}) {
  await ensureDatabase();
  const db = getSql();
  const plans = input.deliveryPlans;
  const deliveryDate =
    plans.length > 0
      ? plans.reduce((min, p) => (p.expectedDeliveryDate < min ? p.expectedDeliveryDate : min), plans[0].expectedDeliveryDate)
      : input.expectedDeliveryDate;
  const rows = await db<OrderProgressRow[]>`
    with seq as (
      insert into order_progress_number_sequences (key, next_number)
      values ('IG-PO', 10001)
      on conflict (key) do update
      set next_number = order_progress_number_sequences.next_number + 1
      returning next_number - 1 as issue_number
    )
    insert into order_progress (
      order_number,
      po_number,
      product_name,
      sku,
      quantity,
      order_date,
      delivery_date,
      order_type,
      progress,
      factory_name,
      region,
      created_by
    )
    select
      'IG-PO-' || lpad(coalesce((select issue_number from seq), 10000)::text, 7, '0'),
      ${input.poNumber.trim() || null},
      ${input.productName.trim()},
      ${input.sku.trim()},
      ${input.quantity},
      ${input.orderDate},
      ${deliveryDate},
      ${input.orderType},
      ${input.progress},
      ${input.factoryName.trim()},
      ${input.region},
      ${input.createdBy}
    returning
      id,
      coalesce(order_number, '') as order_number,
      product_name,
      sku,
      quantity,
      order_date::text,
      delivery_date::text,
      order_type,
      progress,
      factory_name,
      region,
      created_by,
      created_at::text,
      updated_at::text,
      po_number,
      po_batch,
      unit_cost_snapshot::text,
      po_delivery_date::text,
      po_serial_code,
      po_bluetooth_id;
  `;
  const newId = Number(rows[0].id);
  if (plans.length > 0) {
    await replaceOrderProgressDeliveryPlans(db, newId, plans);
  }
  await seedOrderProductionStepsFromTemplate(db, newId, input.productName.trim(), input.sku.trim());
  const planMap = await loadDeliveryPlansByProgressIds(db, [newId]);
  const stepMap = await loadOrderProductionStepsByIds(db, [newId]);
  return mapOrderProgress(rows[0], planMap.get(newId) ?? [], stepMap.get(newId) ?? []);
}

export async function orderProgressPoSkuExists(poNumber: string, sku: string): Promise<boolean> {
  const po = poNumber.trim();
  const sk = sku.trim();
  if (!po || !sk) return false;
  await ensureDatabase();
  const db = getSql();
  const rows = await db<{ ok: number }[]>`
    select 1 as ok
    from order_progress
    where po_number = ${po} and sku = ${sk}
    limit 1;
  `;
  return rows.length > 0;
}

export async function updateOrderProgress(input: {
  id: string;
  poNumber: string;
  productName: string;
  sku: string;
  quantity: number;
  orderDate: string;
  expectedDeliveryDate: string;
  orderType: OrderProgressOrderType;
  progress: OrderProgressStatus;
  factoryName: string;
  region: OrderProgressRegion;
  deliveryPlans: ParsedOrderProgressDeliveryPlan[];
}) {
  await ensureDatabase();
  const db = getSql();
  const plans = input.deliveryPlans;
  const deliveryDate =
    plans.length > 0
      ? plans.reduce((min, p) => (p.expectedDeliveryDate < min ? p.expectedDeliveryDate : min), plans[0].expectedDeliveryDate)
      : input.expectedDeliveryDate;

  const beforeRows = await db<{ product_name: string; sku: string }[]>`
    select product_name, sku
    from order_progress
    where id = ${Number(input.id)}
    limit 1;
  `;
  const before = beforeRows[0];

  const rows = await db<OrderProgressRow[]>`
    update order_progress
    set
      po_number = ${input.poNumber.trim() || null},
      product_name = ${input.productName.trim()},
      sku = ${input.sku.trim()},
      quantity = ${input.quantity},
      order_date = ${input.orderDate},
      delivery_date = ${deliveryDate},
      order_type = ${input.orderType},
      progress = ${input.progress},
      factory_name = ${input.factoryName.trim()},
      region = ${input.region},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id,
      coalesce(order_number, '') as order_number,
      product_name,
      sku,
      quantity,
      order_date::text,
      delivery_date::text,
      order_type,
      progress,
      factory_name,
      region,
      created_by,
      created_at::text,
      updated_at::text,
      po_number,
      po_batch,
      unit_cost_snapshot::text,
      po_delivery_date::text,
      po_serial_code,
      po_bluetooth_id;
  `;
  if (!rows[0]) {
    return null;
  }
  const pid = Number(rows[0].id);
  await replaceOrderProgressDeliveryPlans(db, pid, plans);
  if (
    before &&
    (before.product_name !== input.productName.trim() || before.sku !== input.sku.trim())
  ) {
    await replaceOrderProductionStepsForOrder(
      db,
      pid,
      input.productName.trim(),
      input.sku.trim(),
    );
  }
  const planMap = await loadDeliveryPlansByProgressIds(db, [pid]);
  const stepMap = await loadOrderProductionStepsByIds(db, [pid]);
  return mapOrderProgress(rows[0], planMap.get(pid) ?? [], stepMap.get(pid) ?? []);
}

export async function createOrderProgressDeletionLog(input: {
  orderProgressId: string;
  orderNumber: string;
  forecastNumber: string;
  sku: string;
  region: OrderProgressRegion;
  reason: string;
  deletedBy: string;
}) {
  await ensureDatabase();
  const db = getSql();
  await db`
    insert into order_progress_deletion_logs (
      order_progress_id,
      order_number,
      forecast_number,
      sku,
      region,
      reason,
      deleted_by
    )
    values (
      ${Number(input.orderProgressId)},
      ${input.orderNumber.trim()},
      ${input.forecastNumber.trim()},
      ${input.sku.trim()},
      ${input.region},
      ${input.reason.trim()},
      ${input.deletedBy}
    );
  `;
}

export async function listOrderProgressDeletionLogsBySessionRegions(
  regions: Region[],
  limit = 100,
): Promise<OrderProgressDeletionLog[]> {
  await ensureDatabase();
  const db = getSql();
  const allowed = orderProgressRegionsForSession(regions);
  if (allowed.length === 0) return [];
  const rows = await db<OrderProgressDeletionLogRow[]>`
    select
      id,
      order_progress_id,
      order_number,
      forecast_number,
      sku,
      region,
      reason,
      deleted_by,
      deleted_at::text
    from order_progress_deletion_logs
    where region = any(${allowed})
    order by deleted_at desc, id desc
    limit ${limit};
  `;
  return rows.map((r) => ({
    id: String(r.id),
    orderProgressId: String(r.order_progress_id),
    orderNumber: r.order_number || "",
    forecastNumber: r.forecast_number || "",
    sku: r.sku,
    region: r.region,
    reason: r.reason || "",
    deletedBy: r.deleted_by,
    deletedAt: r.deleted_at,
  }));
}

export async function deleteOrderProgressById(id: string) {
  await ensureDatabase();
  const db = getSql();
  await db`
    delete from order_progress
    where id = ${Number(id)};
  `;
}

export async function listProductionStepTemplates(
  productName: string,
  sku: string,
): Promise<ProductionStepTemplateEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<{ id: number; sort_order: number; label: string }[]>`
    select id, sort_order, label
    from production_step_templates
    where product_name = ${productName.trim()} and sku = ${sku.trim()}
    order by sort_order asc, id asc;
  `;
  return rows.map((r) => ({
    id: String(r.id),
    sortOrder: Number(r.sort_order),
    label: r.label,
  }));
}

export async function replaceProductionStepTemplates(
  productName: string,
  sku: string,
  labels: string[],
): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  const cleaned = labels
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .map((l) => l.slice(0, MAX_PRODUCTION_STEP_LABEL_LEN));
  if (cleaned.length > MAX_PRODUCTION_TEMPLATE_STEPS) {
    throw new Error(`At most ${MAX_PRODUCTION_TEMPLATE_STEPS} steps allowed`);
  }
  await db`
    delete from production_step_templates
    where product_name = ${productName.trim()} and sku = ${sku.trim()};
  `;
  let sortOrder = 0;
  for (const label of cleaned) {
    await db`
      insert into production_step_templates (product_name, sku, sort_order, label)
      values (${productName.trim()}, ${sku.trim()}, ${sortOrder}, ${label});
    `;
    sortOrder += 1;
  }
}

export async function updateOrderProductionStepDone(input: {
  orderProgressId: string;
  stepId: string;
  done: boolean;
  username: string;
}): Promise<OrderProductionStep | null> {
  await ensureDatabase();
  const db = getSql();
  const sid = Number(input.stepId);
  const oid = Number(input.orderProgressId);
  const rows = input.done
    ? await db<OrderProductionStepRow[]>`
        update order_production_steps
        set
          done = true,
          completed_at = now(),
          completed_by = ${input.username}
        where id = ${sid} and order_progress_id = ${oid}
        returning
          id,
          order_progress_id,
          sort_order,
          label,
          done,
          completed_at::text,
          completed_by;
      `
    : await db<OrderProductionStepRow[]>`
        update order_production_steps
        set
          done = false,
          completed_at = null,
          completed_by = null
        where id = ${sid} and order_progress_id = ${oid}
        returning
          id,
          order_progress_id,
          sort_order,
          label,
          done,
          completed_at::text,
          completed_by;
      `;
  return rows[0] ? mapOrderProductionStepRow(rows[0]) : null;
}

type LogisticsShipmentRow = {
  id: number;
  movement_type: LogisticsMovementType;
  product_name: string;
  sku: string;
  po_number: string;
  quantity: number;
  from_location: string;
  to_location: string;
  order_progress_id: number | null;
  tracking_number: string;
  carrier: string;
  status: LogisticsShipmentStatus;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function isLogisticsLocation(value: string): value is LogisticsLocation {
  return value === "FACTORY" || value === "APAC" || value === "EU" || value === "US";
}

export function sessionCanAccessLogisticsEndpoints(
  session: SessionPayload,
  fromLocation: LogisticsLocation,
  toLocation: LogisticsLocation,
): boolean {
  if (session.role === "super_admin") {
    return true;
  }
  const allowed = new Set(orderProgressRegionsForSession(session.regions));
  const fromOffice = fromLocation !== "FACTORY" && allowed.has(fromLocation as OrderProgressRegion);
  const toOffice = toLocation !== "FACTORY" && allowed.has(toLocation as OrderProgressRegion);
  return fromOffice || toOffice;
}

function mapLogisticsShipment(row: LogisticsShipmentRow): LogisticsShipmentEntry {
  const fromL = isLogisticsLocation(row.from_location) ? row.from_location : "FACTORY";
  const toL = isLogisticsLocation(row.to_location) ? row.to_location : "APAC";
  const opId = row.order_progress_id;
  return {
    id: String(row.id),
    movementType: row.movement_type,
    productName: row.product_name,
    sku: row.sku,
    poNumber: row.po_number || "",
    quantity: Number(row.quantity ?? 0),
    fromLocation: fromL,
    toLocation: toL,
    orderProgressId: opId != null ? String(opId) : null,
    trackingNumber: row.tracking_number || "",
    carrier: row.carrier || "",
    status: row.status,
    notes: row.notes || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listLogisticsShipmentsBySession(session: SessionPayload) {
  await ensureDatabase();
  const db = getSql();
  if (session.role === "super_admin") {
    const rows = await db<LogisticsShipmentRow[]>`
      select
        id,
        movement_type,
        product_name,
        sku,
        po_number,
        quantity,
        from_location,
        to_location,
        order_progress_id,
        tracking_number,
        carrier,
        status,
        notes,
        created_by,
        created_at::text,
        updated_at::text
      from logistics_shipments
      order by updated_at desc, id desc
      limit 500;
    `;
    return rows.map(mapLogisticsShipment);
  }
  const allowed = orderProgressRegionsForSession(session.regions);
  if (allowed.length === 0) {
    return [];
  }
  const rows = await db<LogisticsShipmentRow[]>`
    select
      id,
      movement_type,
      product_name,
      sku,
      po_number,
      quantity,
      from_location,
      to_location,
      order_progress_id,
      tracking_number,
      carrier,
      status,
      notes,
      created_by,
      created_at::text,
      updated_at::text
    from logistics_shipments
    where from_location = any(${allowed}) or to_location = any(${allowed})
    order by updated_at desc, id desc
    limit 500;
  `;
  return rows.map(mapLogisticsShipment);
}

export async function getLogisticsShipmentById(id: string) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<LogisticsShipmentRow[]>`
    select
      id,
      movement_type,
      product_name,
      sku,
      po_number,
      quantity,
      from_location,
      to_location,
      order_progress_id,
      tracking_number,
      carrier,
      status,
      notes,
      created_by,
      created_at::text,
      updated_at::text
    from logistics_shipments
    where id = ${Number(id)}
    limit 1;
  `;
  return rows[0] ? mapLogisticsShipment(rows[0]) : null;
}

export async function createLogisticsShipment(input: {
  movementType: LogisticsMovementType;
  productName: string;
  sku: string;
  poNumber: string;
  quantity: number;
  fromLocation: LogisticsLocation;
  toLocation: LogisticsLocation;
  orderProgressId: string | null;
  trackingNumber: string;
  carrier: string;
  status: LogisticsShipmentStatus;
  notes: string;
  createdBy: string;
}) {
  await ensureDatabase();
  const db = getSql();
  const opId =
    input.orderProgressId && input.orderProgressId.trim() !== ""
      ? Number(input.orderProgressId)
      : null;
  const rows = await db<LogisticsShipmentRow[]>`
    insert into logistics_shipments (
      movement_type,
      product_name,
      sku,
      po_number,
      quantity,
      from_location,
      to_location,
      order_progress_id,
      tracking_number,
      carrier,
      status,
      notes,
      created_by
    )
    values (
      ${input.movementType},
      ${input.productName.trim()},
      ${input.sku.trim()},
      ${input.poNumber.trim()},
      ${input.quantity},
      ${input.fromLocation},
      ${input.toLocation},
      ${opId},
      ${input.trackingNumber.trim()},
      ${input.carrier.trim()},
      ${input.status},
      ${input.notes.trim()},
      ${input.createdBy}
    )
    returning
      id,
      movement_type,
      product_name,
      sku,
      po_number,
      quantity,
      from_location,
      to_location,
      order_progress_id,
      tracking_number,
      carrier,
      status,
      notes,
      created_by,
      created_at::text,
      updated_at::text;
  `;
  return mapLogisticsShipment(rows[0]);
}

export async function updateLogisticsShipment(input: {
  id: string;
  movementType: LogisticsMovementType;
  productName: string;
  sku: string;
  poNumber: string;
  quantity: number;
  fromLocation: LogisticsLocation;
  toLocation: LogisticsLocation;
  orderProgressId: string | null;
  trackingNumber: string;
  carrier: string;
  status: LogisticsShipmentStatus;
  notes: string;
}) {
  await ensureDatabase();
  const db = getSql();
  const opId =
    input.orderProgressId && input.orderProgressId.trim() !== ""
      ? Number(input.orderProgressId)
      : null;
  const rows = await db<LogisticsShipmentRow[]>`
    update logistics_shipments
    set
      movement_type = ${input.movementType},
      product_name = ${input.productName.trim()},
      sku = ${input.sku.trim()},
      po_number = ${input.poNumber.trim()},
      quantity = ${input.quantity},
      from_location = ${input.fromLocation},
      to_location = ${input.toLocation},
      order_progress_id = ${opId},
      tracking_number = ${input.trackingNumber.trim()},
      carrier = ${input.carrier.trim()},
      status = ${input.status},
      notes = ${input.notes.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id,
      movement_type,
      product_name,
      sku,
      po_number,
      quantity,
      from_location,
      to_location,
      order_progress_id,
      tracking_number,
      carrier,
      status,
      notes,
      created_by,
      created_at::text,
      updated_at::text;
  `;
  return rows[0] ? mapLogisticsShipment(rows[0]) : null;
}

export async function deleteLogisticsShipmentById(id: string) {
  await ensureDatabase();
  const db = getSql();
  await db`
    delete from logistics_shipments
    where id = ${Number(id)};
  `;
}

function mapProduct(row: ProductRow): ProductItem {
  return {
    id: String(row.id),
    productName: row.product_name,
    sku: row.sku,
    variant: row.variant,
    unitCost: Number(row.unit_cost || 0),
    articleNumber: row.article_number,
    isActive: row.is_active,
    createdAt: row.created_at,
  };
}

function mapSupplier(row: SupplierRow): SupplierEntry {
  return {
    id: String(row.id),
    name: row.name,
    address: row.address || "",
    contactName: row.contact_name || "",
    contactPhone: row.contact_phone || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapContract(row: ContractRow): ContractEntry {
  return {
    id: String(row.id),
    orderProgressId: String(row.order_progress_id),
    supplierId: String(row.supplier_id),
    supplierName: row.supplier_name,
    poNumber: row.po_number,
    signedDate: formatPgDateOnly(row.signed_date),
    sku: row.sku,
    productName: row.product_name,
    batch: row.batch || "",
    quantity: Number(row.quantity ?? 0),
    unitCost: Number(row.unit_cost ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    deliveryDate: formatPgDateOnly(row.delivery_date),
    currency: row.currency || "USD",
    paymentTerms: row.payment_terms || "Cash",
    qualityRemarks: row.quality_remarks || "",
    deliveryAddress: row.delivery_address || "",
    serialCode: row.serial_code || "",
    bluetoothId: row.bluetooth_id || "",
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listSuppliers(): Promise<SupplierEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<SupplierRow[]>`
    select id, name, address, contact_name, contact_phone, created_at::text, updated_at::text
    from suppliers
    order by name asc, id asc;
  `;
  return rows.map(mapSupplier);
}

export async function createSupplier(input: {
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
}): Promise<SupplierEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<SupplierRow[]>`
    insert into suppliers (name, address, contact_name, contact_phone, updated_at)
    values (
      ${input.name.trim()},
      ${input.address.trim()},
      ${input.contactName.trim()},
      ${input.contactPhone.trim()},
      now()
    )
    returning id, name, address, contact_name, contact_phone, created_at::text, updated_at::text;
  `;
  return mapSupplier(rows[0]);
}

export async function updateSupplier(input: {
  id: string;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
}): Promise<SupplierEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<SupplierRow[]>`
    update suppliers
    set
      name = ${input.name.trim()},
      address = ${input.address.trim()},
      contact_name = ${input.contactName.trim()},
      contact_phone = ${input.contactPhone.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning id, name, address, contact_name, contact_phone, created_at::text, updated_at::text;
  `;
  return rows[0] ? mapSupplier(rows[0]) : null;
}

export async function deleteSupplierById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from suppliers where id = ${Number(id)};`;
}

export async function listContractsBySessionRegions(regions: Region[]): Promise<ContractEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const allowed = orderProgressRegionsForSession(regions);
  if (allowed.length === 0) return [];
  const rows = await db<ContractRow[]>`
    select
      c.id,
      c.order_progress_id,
      c.supplier_id,
      c.supplier_name,
      c.po_number,
      c.signed_date::text,
      c.sku,
      c.product_name,
      c.batch,
      c.quantity,
      c.unit_cost::text,
      c.total_amount::text,
      c.delivery_date::text,
      c.currency,
      c.payment_terms,
      c.quality_remarks,
      c.delivery_address,
      c.serial_code,
      c.bluetooth_id,
      c.status,
      c.created_by,
      c.created_at::text,
      c.updated_at::text
    from contracts c
    join order_progress op on op.id = c.order_progress_id
    where op.region = any(${allowed})
    order by c.created_at desc, c.id desc;
  `;
  return rows.map(mapContract);
}

export async function listContractsByPoNumberInSessionRegions(
  regions: Region[],
  poNumber: string,
): Promise<ContractEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const allowed = orderProgressRegionsForSession(regions);
  if (allowed.length === 0) return [];
  const normalizedPo = poNumber.trim();
  if (!normalizedPo) return [];
  const rows = await db<ContractRow[]>`
    select
      c.id,
      c.order_progress_id,
      c.supplier_id,
      c.supplier_name,
      c.po_number,
      c.signed_date::text,
      c.sku,
      c.product_name,
      c.batch,
      c.quantity,
      c.unit_cost::text,
      c.total_amount::text,
      c.delivery_date::text,
      c.currency,
      c.payment_terms,
      c.quality_remarks,
      c.delivery_address,
      c.serial_code,
      c.bluetooth_id,
      c.status,
      c.created_by,
      c.created_at::text,
      c.updated_at::text
    from contracts c
    join order_progress op on op.id = c.order_progress_id
    where op.region = any(${allowed})
      and c.po_number = ${normalizedPo}
    order by c.sku asc, c.id asc;
  `;
  return rows.map(mapContract);
}

export async function createContractFromOrder(input: {
  orderProgressId: string;
  supplierId: string;
  batch: string;
  currency: string;
  paymentTerms: string;
  qualityRemarks: string;
  deliveryAddress: string;
  serialCode: string;
  bluetoothId: string;
  createdBy: string;
}): Promise<ContractEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ContractRow[]>`
    with src as (
      select
        op.id as order_progress_id,
        op.po_number,
        op.product_name,
        op.sku,
        op.quantity,
        op.created_at::date as signed_date,
        (op.created_at::date + interval '56 days')::date as delivery_date,
        s.id as supplier_id,
        s.name as supplier_name,
        p.unit_cost::numeric as unit_cost
      from order_progress op
      join suppliers s on s.id = ${Number(input.supplierId)}
      left join products p on p.product_name = op.product_name and p.sku = op.sku and p.is_active = true
      where op.id = ${Number(input.orderProgressId)}
        and coalesce(trim(op.po_number), '') <> ''
      order by p.id asc
      limit 1
    ),
    ins as (
      insert into contracts (
        order_progress_id,
        supplier_id,
        supplier_name,
        po_number,
        signed_date,
        sku,
        product_name,
        batch,
        quantity,
        unit_cost,
        total_amount,
        delivery_date,
        currency,
        payment_terms,
        quality_remarks,
        delivery_address,
        serial_code,
        bluetooth_id,
        status,
        created_by
      )
      select
        src.order_progress_id,
        src.supplier_id,
        src.supplier_name,
        src.po_number as po_number,
        src.signed_date,
        src.sku,
        src.product_name,
        ${input.batch.trim()},
        src.quantity,
        coalesce(src.unit_cost, 0),
        src.quantity * coalesce(src.unit_cost, 0),
        src.delivery_date,
        ${input.currency.trim()},
        ${input.paymentTerms.trim()},
        ${input.qualityRemarks.trim()},
        ${input.deliveryAddress.trim()},
        ${input.serialCode.trim()},
        ${input.bluetoothId.trim()},
        'draft',
        ${input.createdBy}
      from src
      returning *
    ),
    upd as (
      update order_progress op
      set
        po_number = ins.po_number,
        po_batch = ins.batch,
        po_serial_code = ins.serial_code,
        po_bluetooth_id = ins.bluetooth_id,
        unit_cost_snapshot = ins.unit_cost,
        po_delivery_date = ins.delivery_date
      from ins
      where op.id = ins.order_progress_id
      returning op.id
    )
    select
      id,
      order_progress_id,
      supplier_id,
      supplier_name,
      po_number,
      signed_date::text,
      sku,
      product_name,
      batch,
      quantity,
      unit_cost::text,
      total_amount::text,
      delivery_date::text,
      currency,
      payment_terms,
      quality_remarks,
      delivery_address,
      serial_code,
      bluetooth_id,
      status,
      created_by,
      created_at::text,
      updated_at::text
    from ins;
  `;
  if (!rows[0]) {
    throw new Error("Create contract failed");
  }
  return mapContract(rows[0]);
}

export async function getContractById(id: string): Promise<ContractEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ContractRow[]>`
    select
      id,
      order_progress_id,
      supplier_id,
      supplier_name,
      po_number,
      signed_date::text,
      sku,
      product_name,
      batch,
      quantity,
      unit_cost::text,
      total_amount::text,
      delivery_date::text,
      currency,
      payment_terms,
      quality_remarks,
      delivery_address,
      serial_code,
      bluetooth_id,
      status,
      created_by,
      created_at::text,
      updated_at::text
    from contracts
    where id = ${Number(id)}
    limit 1;
  `;
  return rows[0] ? mapContract(rows[0]) : null;
}

export async function updateContractStatusById(
  id: string,
  status: ContractStatus,
): Promise<ContractEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ContractRow[]>`
    update contracts
    set status = ${status}, updated_at = now()
    where id = ${Number(id)}
    returning
      id,
      order_progress_id,
      supplier_id,
      supplier_name,
      po_number,
      signed_date::text,
      sku,
      product_name,
      batch,
      quantity,
      unit_cost::text,
      total_amount::text,
      delivery_date::text,
      currency,
      payment_terms,
      quality_remarks,
      delivery_address,
      serial_code,
      bluetooth_id,
      status,
      created_by,
      created_at::text,
      updated_at::text;
  `;
  return rows[0] ? mapContract(rows[0]) : null;
}
