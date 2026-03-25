import { ensureDatabase, getSql } from "@/lib/db";
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
  OrderProgressDeliveryPlan,
  OrderProgressEntry,
  OrderProgressOrderType,
  OrderProgressRegion,
  OrderProgressStatus,
  ProductItem,
  Region,
  SessionPayload,
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

export async function officeExistsByRegion(region: Region, office: string) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<{ id: number }[]>`
    select id
    from offices
    where region = ${region} and name = ${office}
    limit 1;
  `;
  return rows.length > 0;
}

export async function createForecast(input: {
  month: string;
  region: Region;
  office: string;
  productName: string;
  sku: string;
  remark: string;
  buildToOrder: number;
  buildToStock: number;
  createdBy: string;
}) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<
    {
      id: number;
      forecast_month: string;
      region: Region;
      office: string;
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
      office,
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
      ${input.office},
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
      office,
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

export async function getForecastsByRegions(regions: Region[]) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<
    {
      id: number;
      forecast_month: string;
      region: Region;
      office: string;
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
      office,
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
  office: string;
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
    office: row.office,
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

function mapOrderProgress(row: OrderProgressRow, deliveryPlans: OrderProgressDeliveryPlan[]): OrderProgressEntry {
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
  };
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
      updated_at::text
    from order_progress
    where region = any(${allowed})
    order by updated_at desc, id desc
    limit 500;
  `;
  const planMap = await loadDeliveryPlansByProgressIds(
    db,
    rows.map((r) => Number(r.id)),
  );
  return rows.map((row) => mapOrderProgress(row, planMap.get(Number(row.id)) ?? []));
}

export async function getOrderProgressById(id: string) {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<OrderProgressRow[]>`
    select
      id,
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
      updated_at::text
    from order_progress
    where id = ${Number(id)}
    limit 1;
  `;
  if (!rows[0]) {
    return null;
  }
  const planMap = await loadDeliveryPlansByProgressIds(db, [Number(rows[0].id)]);
  return mapOrderProgress(rows[0], planMap.get(Number(rows[0].id)) ?? []);
}

export async function createOrderProgress(input: {
  orderNumber: string;
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
    insert into order_progress (
      order_number,
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
    values (
      ${input.orderNumber.trim()},
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
    )
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
      updated_at::text;
  `;
  const newId = Number(rows[0].id);
  if (plans.length > 0) {
    await replaceOrderProgressDeliveryPlans(db, newId, plans);
  }
  const planMap = await loadDeliveryPlansByProgressIds(db, [newId]);
  return mapOrderProgress(rows[0], planMap.get(newId) ?? []);
}

export async function updateOrderProgress(input: {
  id: string;
  orderNumber: string;
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
  const rows = await db<OrderProgressRow[]>`
    update order_progress
    set
      order_number = ${input.orderNumber.trim()},
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
      updated_at::text;
  `;
  if (!rows[0]) {
    return null;
  }
  const pid = Number(rows[0].id);
  await replaceOrderProgressDeliveryPlans(db, pid, plans);
  const planMap = await loadDeliveryPlansByProgressIds(db, [pid]);
  return mapOrderProgress(rows[0], planMap.get(pid) ?? []);
}

export async function deleteOrderProgressById(id: string) {
  await ensureDatabase();
  const db = getSql();
  await db`
    delete from order_progress
    where id = ${Number(id)};
  `;
}

type LogisticsShipmentRow = {
  id: number;
  movement_type: LogisticsMovementType;
  product_name: string;
  sku: string;
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
