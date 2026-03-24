import { ensureDatabase, getSql } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/security";
import {
  AdminAuditLog,
  AdminUser,
  ForecastEntry,
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
