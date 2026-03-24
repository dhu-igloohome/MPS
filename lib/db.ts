import postgres from "postgres";

import { OFFICES_BY_REGION, REGIONS, USER_ACCOUNTS } from "@/lib/accounts";
import { hashPassword } from "@/lib/security";
import { Region } from "@/lib/types";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";

const sql = connectionString
  ? postgres(connectionString, {
      ssl: "require",
      max: 1,
    })
  : null;

let bootstrapped = false;
let bootstrapPromise: Promise<void> | null = null;

function allOffices() {
  const rows: { name: string; region: Region }[] = [];
  for (const region of REGIONS) {
    for (const office of OFFICES_BY_REGION[region]) {
      rows.push({ name: office, region });
    }
  }
  return rows;
}

async function setupSchema() {
  const db = getSql();
  await db`
    create table if not exists users (
      username text primary key,
      password_hash text not null,
      display_name text not null,
      role text not null check (role in ('super_admin', 'regional_admin')),
      created_at timestamptz not null default now()
    );
  `;

  await db`
    create table if not exists user_regions (
      username text not null references users(username) on delete cascade,
      region text not null check (region in ('APAC', 'EU', 'USA')),
      primary key (username, region)
    );
  `;

  await db`
    create table if not exists offices (
      id serial primary key,
      name text not null unique,
      region text not null check (region in ('APAC', 'EU', 'USA'))
    );
  `;

  await db`
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

  await db`
    create table if not exists admin_audit_logs (
      id bigserial primary key,
      actor_username text not null references users(username),
      action text not null,
      target_username text not null,
      details text not null default '',
      created_at timestamptz not null default now()
    );
  `;
}

async function seedUsers() {
  const db = getSql();
  for (const account of USER_ACCOUNTS) {
    await db`
      insert into users (username, password_hash, display_name, role)
      values (
        ${account.username},
        ${hashPassword(account.password)},
        ${account.displayName},
        ${account.role}
      )
      on conflict (username) do update
      set
        display_name = excluded.display_name,
        role = excluded.role;
    `;

    for (const region of account.regions) {
      await db`
        insert into user_regions (username, region)
        values (${account.username}, ${region})
        on conflict do nothing;
      `;
    }
  }
}

async function seedOffices() {
  const db = getSql();
  for (const office of allOffices()) {
    await db`
      insert into offices (name, region)
      values (${office.name}, ${office.region})
      on conflict (name) do update
      set region = excluded.region;
    `;
  }
}

export async function ensureDatabase() {
  if (!sql) {
    throw new Error(
      "Database connection is missing. Set POSTGRES_URL (Vercel) or DATABASE_URL (Supabase).",
    );
  }

  if (bootstrapped) {
    return;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      await setupSchema();
      await seedUsers();
      await seedOffices();
      bootstrapped = true;
    })();
  }

  await bootstrapPromise;
}

export function getSql() {
  if (!sql) {
    throw new Error(
      "Database connection is missing. Set POSTGRES_URL (Vercel) or DATABASE_URL (Supabase).",
    );
  }
  return sql;
}
