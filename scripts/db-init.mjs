import postgres from "postgres";
import { createHash } from "node:crypto";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing POSTGRES_URL or DATABASE_URL.");
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: "require", max: 1 });

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

const users = [
  {
    username: "david",
    password: "david123",
    displayName: "David",
    role: "super_admin",
    regions: ["APAC", "EU", "USA"],
  },
  {
    username: "apac_admin",
    password: "apac123",
    displayName: "APAC Admin",
    role: "regional_admin",
    regions: ["APAC"],
  },
  {
    username: "eu_admin",
    password: "eu123",
    displayName: "EU Admin",
    role: "regional_admin",
    regions: ["EU"],
  },
  {
    username: "usa_admin",
    password: "usa123",
    displayName: "USA Admin",
    role: "regional_admin",
    regions: ["USA"],
  },
];

const officesByRegion = {
  APAC: ["Singapore", "Shanghai", "Tokyo", "Seoul", "Sydney"],
  EU: ["London", "Berlin", "Paris", "Amsterdam"],
  USA: ["New York", "San Francisco", "Austin", "Chicago"],
};

const products = [
  {
    productName: "Deadbolt 2S",
    sku: "IGB4",
    variant: "Default",
    unitCost: 120,
    articleNumber: "ART-1001",
  },
  {
    productName: "Entry Level DB",
    sku: "DBX1",
    variant: "Default",
    unitCost: 180,
    articleNumber: "ART-1002",
  },
  {
    productName: "Keybox 3",
    sku: "IGK3",
    variant: "Default",
    unitCost: 95,
    articleNumber: "ART-2001",
  },
];

async function main() {
  await sql`
    create table if not exists users (
      username text primary key,
      password_hash text not null,
      display_name text not null,
      role text not null check (role in ('super_admin', 'regional_admin')),
      created_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists user_regions (
      username text not null references users(username) on delete cascade,
      region text not null check (region in ('APAC', 'EU', 'USA')),
      primary key (username, region)
    );
  `;

  await sql`
    create table if not exists offices (
      id serial primary key,
      name text not null unique,
      region text not null check (region in ('APAC', 'EU', 'USA'))
    );
  `;

  await sql`
    create table if not exists forecasts (
      id bigserial primary key,
      forecast_month text not null,
      region text not null check (region in ('APAC', 'EU', 'USA')),
      office text not null,
      product_name text not null,
      sku text not null,
      build_to_order integer not null default 0,
      build_to_stock integer not null default 0,
      created_by text not null references users(username),
      created_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists products (
      id bigserial primary key,
      product_name text not null,
      sku text not null,
      variant text not null,
      unit_cost numeric(12, 2) not null default 0,
      article_number text not null,
      is_active boolean not null default true,
      created_at timestamptz not null default now()
    );
  `;
  await sql`alter table products drop constraint if exists products_sku_key;`;
  await sql`
    create unique index if not exists idx_products_sku_variant_unique
    on products (sku, variant);
  `;

  await sql`
    create table if not exists admin_audit_logs (
      id bigserial primary key,
      actor_username text not null references users(username),
      action text not null,
      target_username text not null,
      details text not null default '',
      created_at timestamptz not null default now()
    );
  `;

  for (const user of users) {
    await sql`
      insert into users (username, password_hash, display_name, role)
      values (${user.username}, ${hashPassword(user.password)}, ${user.displayName}, ${user.role})
      on conflict (username) do update
      set display_name = excluded.display_name, role = excluded.role;
    `;

    for (const region of user.regions) {
      await sql`
        insert into user_regions (username, region)
        values (${user.username}, ${region})
        on conflict do nothing;
      `;
    }
  }

  for (const [region, offices] of Object.entries(officesByRegion)) {
    for (const office of offices) {
      await sql`
        insert into offices (name, region)
        values (${office}, ${region})
        on conflict (name) do update
        set region = excluded.region;
      `;
    }
  }

  for (const item of products) {
    await sql`
      insert into products (product_name, sku, variant, unit_cost, article_number, is_active)
      values (${item.productName}, ${item.sku}, ${item.variant}, ${item.unitCost}, ${item.articleNumber}, true)
      on conflict (sku, variant) do update
      set
        product_name = excluded.product_name,
        unit_cost = excluded.unit_cost,
        article_number = excluded.article_number;
    `;
  }

  // Remove legacy demo rows so UI only shows the new defaults.
  await sql`
    delete from products
    where sku in ('RTR-PRO-001', 'RTR-PRO-002', 'GTW-X-001');
  `;

  console.log("Database initialized successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });
