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
  {
    username: "jessie",
    password: "jessie123",
    displayName: "Jessie",
    role: "regional_admin",
    regions: ["APAC", "EU", "USA"],
  },
];

const officesByRegion = {
  APAC: [
    "新加坡 (Singapore) - 总部",
    "中国 深圳 (Shenzhen)",
    "越南 胡志明市 (Ho Chi Minh City)",
    "菲律宾 马尼拉 (Manila)",
    "泰国 曼谷 (Bangkok)",
    "马来西亚 吉隆坡 (Kuala Lumpur)",
    "印度 班加罗尔 (Bengaluru)",
    "印度尼西亚 雅加达 (Jakarta)",
    "日本 东京 (Tokyo)",
    "澳大利亚 悉尼 (Sydney)",
  ],
  EU: ["英国 达文特里 (Daventry)", "爱尔兰 布雷 (Bray)"],
  USA: ["美国 奥斯汀 (Austin)"],
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
      destination text not null default '',
      po_number text not null default '',
      product_name text not null,
      sku text not null,
      remark text not null default '',
      ops_action text not null default '',
      build_to_order integer not null default 0,
      build_to_stock integer not null default 0,
      created_by text not null references users(username),
      created_at timestamptz not null default now()
    );
  `;
  await sql`alter table forecasts add column if not exists remark text not null default '';`;
  await sql`alter table forecasts add column if not exists destination text not null default '';`;
  await sql`alter table forecasts add column if not exists po_number text not null default '';`;
  await sql`alter table forecasts add column if not exists incoterm text not null default 'EXW';`;
  await sql`alter table forecasts add column if not exists ops_action text not null default '';`;
  await sql`alter table forecasts drop column if exists office;`;

  await sql`
    create table if not exists forecast_po_sequences (
      bucket text primary key,
      next_number integer not null
    );
  `;

  await sql`
    update forecasts
    set po_number = 'LEGACY-F-' || id::text
    where trim(po_number) = '' or po_number is null;
  `;
  await sql`drop index if exists idx_forecasts_po_number_unique;`;
  await sql`create index if not exists idx_forecasts_po_number on forecasts (po_number);`;
  await sql`
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
  await sql`drop trigger if exists trg_prevent_forecast_po_number_update on forecasts;`;
  await sql`
    create trigger trg_prevent_forecast_po_number_update
    before update on forecasts
    for each row
    execute function prevent_forecast_po_number_update();
  `;

  await sql`
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
  await sql`
    alter table order_progress
    add column if not exists order_date date not null default current_date;
  `;
  await sql`
    alter table order_progress
    add column if not exists order_number text not null default '';
  `;

  await sql`
    create table if not exists po_sequences (
      key text primary key,
      next_number integer not null
    );
  `;
  await sql`
    create table if not exists order_progress_number_sequences (
      key text primary key,
      next_number integer not null
    );
  `;

  await sql`alter table order_progress add column if not exists po_number text;`;
  await sql`alter table order_progress add column if not exists po_batch text not null default '';`;
  await sql`alter table order_progress add column if not exists po_serial_code text not null default '';`;
  await sql`alter table order_progress add column if not exists po_bluetooth_id text not null default '';`;
  await sql`alter table order_progress add column if not exists unit_cost_snapshot numeric(12, 2) not null default 0;`;
  await sql`alter table order_progress add column if not exists po_delivery_date date;`;

  await sql`drop index if exists idx_order_progress_po_number_unique;`;
  await sql`
    create unique index if not exists idx_order_progress_po_sku_unique
    on order_progress (po_number, sku)
    where po_number is not null and trim(po_number) <> '';
  `;

  await sql`
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

  await sql`
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
      unit_cost_quote_id_snapshot bigint,
      unit_cost_quote_date_snapshot date,
      currency text not null default 'USD',
      payment_terms text not null default 'Cash',
      remark text not null default '',
      delivery_address text not null default '',
      serial_code text not null default '',
      bluetooth_id text not null default '',
      status text not null default 'draft' check (status in ('draft', 'approved', 'sent')),
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await sql`
    create index if not exists idx_contracts_order_progress_id on contracts (order_progress_id);
  `;
  await sql`alter table contracts drop constraint if exists contracts_po_number_key;`;
  await sql`drop index if exists idx_contracts_po_number_unique;`;
  await sql`
    create unique index if not exists idx_contracts_po_sku_unique
    on contracts (po_number, sku);
  `;
  await sql`drop index if exists idx_contracts_po_sku_unique;`;
  await sql`create index if not exists idx_contracts_po_sku on contracts (po_number, sku);`;
  await sql`alter table contracts alter column order_progress_id drop not null;`;
  await sql`
    alter table contracts
    add column if not exists forecast_id bigint references forecasts(id) on delete set null;
  `;
  await sql`
    alter table contracts
    add column if not exists buyer_entity_code text not null default 'shenzhen';
  `;
  await sql`create index if not exists idx_contracts_forecast_id on contracts (forecast_id);`;
  await sql`alter table contracts add column if not exists currency text not null default 'USD';`;
  await sql`alter table contracts add column if not exists payment_terms text not null default 'Cash';`;
  await sql`alter table contracts add column if not exists remark text not null default '';`;
  await sql`alter table contracts add column if not exists delivery_address text not null default '';`;
  await sql`alter table contracts add column if not exists unit_cost_quote_id_snapshot bigint;`;
  await sql`alter table contracts add column if not exists unit_cost_quote_date_snapshot date;`;
  await sql.unsafe(`
    DO $contracts_remark_migration$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'quality_remarks'
      ) THEN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'contracts' AND column_name = 'remark'
        ) THEN
          UPDATE contracts c
          SET remark = COALESCE(NULLIF(TRIM(c.remark), ''), c.quality_remarks);
          ALTER TABLE contracts DROP COLUMN quality_remarks;
        ELSE
          ALTER TABLE contracts RENAME COLUMN quality_remarks TO remark;
        END IF;
      END IF;
    END $contracts_remark_migration$;
  `);

  await sql`
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

  await sql`
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

  await sql`
    create index if not exists idx_production_step_templates_product
    on production_step_templates (product_name, sku);
  `;

  await sql`
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

  await sql`
    create index if not exists idx_order_production_steps_order
    on order_production_steps (order_progress_id);
  `;

  await sql`
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
  await sql`alter table logistics_shipments add column if not exists po_number text not null default '';`;

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
  await sql`
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
  await sql`
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

  await sql`
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
  await sql`
    create index if not exists idx_cash_flow_entries_order_date
    on cash_flow_entries (order_date desc, id desc);
  `;

  await sql`
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
  await sql`
    create index if not exists idx_cost_analysis_entries_order_number
    on cost_analysis_entries (order_number);
  `;

  await sql`
    create table if not exists unit_cost_quotes (
      id bigserial primary key,
      sku text not null,
      unit_price numeric(14, 4) not null check (unit_price >= 0),
      tax_included boolean not null default false,
      supplier_name text not null default '',
      quote_date date not null,
      created_by text not null references users(username),
      created_at timestamptz not null default now()
    );
  `;
  await sql`
    create index if not exists idx_unit_cost_quotes_sku_date
    on unit_cost_quotes (sku, quote_date desc, id desc);
  `;
  await sql`alter table unit_cost_quotes add column if not exists manufacturer_country text not null default '';`;
  await sql`alter table unit_cost_quotes add column if not exists destination_country text not null default '';`;
  await sql`alter table unit_cost_quotes add column if not exists destination_tariff_pct numeric(7, 3);`;
  await sql`alter table unit_cost_quotes add column if not exists cm_unit_price_tax_rate_pct numeric(7, 3);`;
  await sql`alter table unit_cost_quotes add column if not exists sea_freight_unit_price numeric(14, 4);`;
  await sql`alter table unit_cost_quotes add column if not exists air_freight_unit_price numeric(14, 4);`;
  await sql`alter table unit_cost_quotes add column if not exists incoterm text not null default 'EXW';`;
  await sql`alter table unit_cost_quotes add column if not exists creation_reason text not null default '';`;
  await sql`alter table unit_cost_quotes add column if not exists deleted_at timestamptz;`;
  await sql`alter table unit_cost_quotes add column if not exists deletion_reason text not null default '';`;
  await sql`alter table unit_cost_quotes add column if not exists deleted_by text;`;

  await sql`
    create table if not exists forecast_cash_flow_settings (
      forecast_id bigint primary key references forecasts(id) on delete cascade,
      supplier_name text not null default '',
      updated_by text not null references users(username),
      updated_at timestamptz not null default now()
    );
  `;
  await sql`alter table forecast_cash_flow_settings add column if not exists po_issue_date date;`;
  await sql`alter table forecast_cash_flow_settings add column if not exists shipping_mode text not null default 'ocean';`;
  await sql`alter table forecast_cash_flow_settings add column if not exists landed_cost_cash_flow_published_at timestamptz;`;
  await sql`alter table forecast_cash_flow_settings add column if not exists unit_price_usd_snapshot numeric(14, 4);`;

  await sql`
    create table if not exists logistics_landed_cost_consolidate (
      id bigserial primary key,
      po_number text not null,
      quote_date date not null,
      destination_country text not null default '',
      destination_tariff_pct numeric(9, 4),
      sea_freight_usd numeric(14, 4),
      air_freight_usd numeric(14, 4),
      incoterm text not null,
      consolidated_usd numeric(16, 4),
      line_items_json jsonb not null default '[]'::jsonb,
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await sql`
    create index if not exists idx_logistics_landed_cost_consolidate_created
    on logistics_landed_cost_consolidate (created_at desc, id desc);
  `;
  await sql`alter table logistics_landed_cost_consolidate add column if not exists updated_at timestamptz not null default now();`;
  await sql`
    create unique index if not exists idx_lcc_po_created_by
    on logistics_landed_cost_consolidate (po_number, created_by);
  `;

  await sql`
    create table if not exists mass_production_kanban (
      id bigserial primary key,
      product_id bigint not null references products(id) on delete restrict,
      quantity integer not null check (quantity >= 0),
      mp text not null default '',
      ee_date date,
      me_date date,
      smt_date date,
      assembly_date date,
      production_report_date date,
      ort_date date,
      coo_approval_date date,
      deliver_date date,
      region text not null check (region in ('APAC', 'EU', 'US', 'Shenzhen office')),
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await sql`
    create index if not exists idx_mass_production_kanban_region_updated
    on mass_production_kanban (region, updated_at desc);
  `;
  await sql`
    alter table mass_production_kanban
    drop constraint if exists mass_production_kanban_region_check;
  `;
  await sql`
    alter table mass_production_kanban
    add constraint mass_production_kanban_region_check
    check (region in ('APAC', 'EU', 'US', 'Shenzhen office'));
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
