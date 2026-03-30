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
      destination text not null default '',
      po_number text not null default '',
      product_name text not null,
      sku text not null,
      remark text not null default '',
      build_to_order integer not null default 0,
      build_to_stock integer not null default 0,
      created_by text not null references users(username),
      created_at timestamptz not null default now()
    );
  `;
  await db`alter table forecasts add column if not exists remark text not null default '';`;
  await db`alter table forecasts add column if not exists destination text not null default '';`;
  await db`alter table forecasts add column if not exists po_number text not null default '';`;
  await db`alter table forecasts drop column if exists office;`;

  await db`
    create table if not exists forecast_po_sequences (
      bucket text primary key,
      next_number integer not null
    );
  `;

  await db`
    update forecasts
    set po_number = 'LEGACY-F-' || id::text
    where trim(po_number) = '' or po_number is null;
  `;
  await db`drop index if exists idx_forecasts_po_number_unique;`;
  await db`create index if not exists idx_forecasts_po_number on forecasts (po_number);`;
  await db`
    create or replace function prevent_forecast_po_number_update()
    returns trigger as $$
    begin
      if new.po_number is distinct from old.po_number then
        raise exception 'Forecast PO number is system-generated and cannot be modified';
      end if;
      return new;
    end;
    $$ language plpgsql;
  `;
  await db`drop trigger if exists trg_prevent_forecast_po_number_update on forecasts;`;
  await db`
    create trigger trg_prevent_forecast_po_number_update
    before update on forecasts
    for each row
    execute function prevent_forecast_po_number_update();
  `;

  await db`
    create table if not exists order_progress (
      id bigserial primary key,
      product_name text not null,
      sku text not null,
      quantity integer not null check (quantity >= 0),
      order_date date not null default current_date,
      delivery_date date not null,
      order_type text not null check (order_type in ('BTO', 'BTS')),
      progress text not null check (progress in ('not_started', 'in_production', 'ready_to_ship')),
      factory_name text not null default '',
      order_number text not null default '',
      region text not null check (region in ('APAC', 'EU', 'US')),
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`
    alter table order_progress
    add column if not exists order_date date not null default current_date;
  `;
  await db`
    alter table order_progress
    add column if not exists order_number text not null default '';
  `;

  await db`
    create table if not exists po_sequences (
      key text primary key,
      next_number integer not null
    );
  `;
  await db`
    create table if not exists order_progress_number_sequences (
      key text primary key,
      next_number integer not null
    );
  `;

  // Purchase contract / PO fields (saved per order line).
  await db`alter table order_progress add column if not exists po_number text;`;
  await db`alter table order_progress add column if not exists po_batch text not null default '';`;
  await db`alter table order_progress add column if not exists po_serial_code text not null default '';`;
  await db`alter table order_progress add column if not exists po_bluetooth_id text not null default '';`;
  await db`alter table order_progress add column if not exists unit_cost_snapshot numeric(12, 2) not null default 0;`;
  await db`alter table order_progress add column if not exists po_delivery_date date;`;

  await db`drop index if exists idx_order_progress_po_number_unique;`;
  await db`
    create unique index if not exists idx_order_progress_po_sku_unique
    on order_progress (po_number, sku)
    where po_number is not null and trim(po_number) <> '';
  `;

  await db`
    create table if not exists suppliers (
      id bigserial primary key,
      name text not null unique,
      address text not null default '',
      contact_name text not null default '',
      contact_phone text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await db`
    create table if not exists contracts (
      id bigserial primary key,
      order_progress_id bigint not null references order_progress(id) on delete cascade,
      supplier_id bigint not null references suppliers(id) on delete restrict,
      supplier_name text not null,
      po_number text not null,
      signed_date date not null,
      sku text not null,
      product_name text not null,
      batch text not null default '',
      quantity integer not null check (quantity >= 0),
      unit_cost numeric(12, 2) not null default 0,
      total_amount numeric(14, 2) not null default 0,
      delivery_date date not null,
      currency text not null default 'USD',
      payment_terms text not null default 'Cash',
      quality_remarks text not null default '',
      delivery_address text not null default '',
      serial_code text not null default '',
      bluetooth_id text not null default '',
      status text not null default 'draft' check (status in ('draft', 'approved', 'sent')),
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await db`
    create index if not exists idx_contracts_order_progress_id on contracts (order_progress_id);
  `;
  await db`alter table contracts drop constraint if exists contracts_po_number_key;`;
  await db`drop index if exists idx_contracts_po_number_unique;`;
  await db`
    create unique index if not exists idx_contracts_po_sku_unique
    on contracts (po_number, sku);
  `;
  await db`alter table contracts add column if not exists currency text not null default 'USD';`;
  await db`alter table contracts add column if not exists payment_terms text not null default 'Cash';`;
  await db`alter table contracts add column if not exists quality_remarks text not null default '';`;
  await db`alter table contracts add column if not exists delivery_address text not null default '';`;
  await db`alter table contracts drop constraint if exists contracts_status_check;`;
  await db`
    alter table contracts
    add constraint contracts_status_check
    check (status in ('draft', 'approved', 'sent'));
  `;

  await db`
    create table if not exists order_progress_delivery_plans (
      id bigserial primary key,
      order_progress_id bigint not null references order_progress(id) on delete cascade,
      expected_delivery_date date not null,
      quantity integer not null check (quantity >= 0),
      progress text not null check (progress in ('not_started', 'in_production', 'ready_to_ship')),
      sort_order integer not null default 0,
      created_at timestamptz not null default now()
    );
  `;

  await db`
    create table if not exists production_step_templates (
      id bigserial primary key,
      product_name text not null,
      sku text not null,
      sort_order integer not null,
      label text not null,
      created_at timestamptz not null default now(),
      unique (product_name, sku, sort_order)
    );
  `;

  await db`
    create index if not exists idx_production_step_templates_product
    on production_step_templates (product_name, sku);
  `;

  await db`
    create table if not exists order_production_steps (
      id bigserial primary key,
      order_progress_id bigint not null references order_progress(id) on delete cascade,
      sort_order integer not null,
      label text not null,
      done boolean not null default false,
      completed_at timestamptz,
      completed_by text references users(username),
      unique (order_progress_id, sort_order)
    );
  `;

  await db`
    create index if not exists idx_order_production_steps_order
    on order_production_steps (order_progress_id);
  `;

  await db`
    create table if not exists logistics_shipments (
      id bigserial primary key,
      movement_type text not null check (movement_type in ('inbound', 'transfer')),
      product_name text not null,
      sku text not null,
      po_number text not null default '',
      quantity integer not null check (quantity >= 0),
      from_location text not null check (from_location in ('FACTORY', 'APAC', 'EU', 'US')),
      to_location text not null check (to_location in ('FACTORY', 'APAC', 'EU', 'US')),
      order_progress_id bigint references order_progress(id) on delete set null,
      tracking_number text not null default '',
      carrier text not null default '',
      status text not null default 'not_shipped'
        check (status in ('not_shipped', 'in_transit', 'delivered', 'cancelled')),
      notes text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      check (from_location <> to_location)
    );
  `;
  await db`alter table logistics_shipments add column if not exists po_number text not null default '';`;

  await db`
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

  await db`alter table products drop constraint if exists products_sku_key;`;
  await db`
    create unique index if not exists idx_products_sku_variant_unique
    on products (sku, variant);
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
  await db`
    create table if not exists forecast_deletion_logs (
      id bigserial primary key,
      forecast_id bigint not null,
      po_number text not null,
      sku text not null,
      region text not null check (region in ('APAC', 'EU', 'USA')),
      reason text not null,
      deleted_by text not null references users(username),
      deleted_at timestamptz not null default now()
    );
  `;
  await db`
    create table if not exists order_progress_deletion_logs (
      id bigserial primary key,
      order_progress_id bigint not null,
      order_number text not null default '',
      forecast_number text not null,
      sku text not null,
      region text not null check (region in ('APAC', 'EU', 'US')),
      reason text not null,
      deleted_by text not null references users(username),
      deleted_at timestamptz not null default now()
    );
  `;

  await db`
    create table if not exists cash_flow_entries (
      id bigserial primary key,
      sku text not null,
      order_date date not null,
      quantity integer not null check (quantity >= 0),
      order_number text not null,
      unit_price numeric(14, 2) not null,
      total_amount numeric(16, 2) not null,
      advance_ratio_pct numeric(7, 3) not null
        check (advance_ratio_pct >= 0 and advance_ratio_pct <= 100),
      payment_term_days integer not null check (payment_term_days >= 0),
      final_ratio_pct numeric(7, 3) not null
        check (final_ratio_pct >= 0 and final_ratio_pct <= 100),
      actual_advance_date date,
      actual_advance_amount numeric(16, 2),
      actual_final_date date,
      actual_final_amount numeric(16, 2),
      remarks text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_cash_flow_entries_order_date
    on cash_flow_entries (order_date desc, id desc);
  `;

  await db`
    create table if not exists cost_analysis_entries (
      id bigserial primary key,
      cm_region text not null default '',
      supplier_name text not null default '',
      sku text not null,
      quantity integer not null check (quantity >= 0),
      order_number text not null,
      order_total_with_tariff numeric(16, 2) not null default 0,
      order_total_without_tariff numeric(16, 2) not null default 0,
      unit_cost_with_tariff numeric(14, 4) not null default 0,
      unit_cost_without_tariff numeric(14, 4) not null default 0,
      includes_china_vat boolean not null default false,
      base_unit_cost_usd numeric(14, 4) not null default 0,
      ee_cost numeric(14, 4) not null default 0,
      me_cost numeric(14, 4) not null default 0,
      assembly_cost numeric(14, 4) not null default 0,
      tariff_pct numeric(7, 3) not null default 0
        check (tariff_pct >= 0 and tariff_pct <= 100),
      air_freight_per_unit numeric(14, 4) not null default 0,
      sea_freight_per_unit numeric(14, 4) not null default 0,
      destination_country text not null default '',
      freight_mode text not null default 'sea'
        check (freight_mode in ('air', 'sea')),
      remarks text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_cost_analysis_entries_order_number
    on cost_analysis_entries (order_number);
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
