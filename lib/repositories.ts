import { ensureDatabase, getSql } from "@/lib/db";
import { verifyPassword } from "@/lib/security";
import { ForecastEntry, Region, SessionPayload } from "@/lib/types";

type UserRow = {
  username: string;
  password_hash: string;
  display_name: string;
  role: SessionPayload["role"];
};

type RegionRow = {
  region: Region;
};

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
