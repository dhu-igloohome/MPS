import postgres from "postgres";

import { OFFICES_BY_REGION, REGIONS, USER_ACCOUNTS } from "@/lib/accounts";
import { hashPassword } from "@/lib/security";
import { Region } from "@/lib/types";

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL || "";

// Pool sizing: serverless functions are typically short-lived and concurrent,
// so favor a small-but-non-trivial pool. `max: 1` serialized every request.
const POOL_MAX = Number(process.env.POSTGRES_POOL_MAX) || (process.env.NODE_ENV === "production" ? 10 : 5);

const sql = connectionString
  ? postgres(connectionString, {
      ssl: "require",
      max: POOL_MAX,
      idle_timeout: 20,
      max_lifetime: 60 * 30,
    })
  : null;

/** Bump when `setupSchema` gains migrations so warm serverless instances re-run bootstrap. */
const CURRENT_SCHEMA_VERSION = 5;
let appliedSchemaVersion = 0;
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
      ops_action text not null default '',
      build_to_order integer not null default 0,
      build_to_stock integer not null default 0,
      created_by text not null references users(username),
      created_at timestamptz not null default now()
    );
  `;
  await db`alter table forecasts add column if not exists remark text not null default '';`;
  await db`alter table forecasts add column if not exists destination text not null default '';`;
  await db`alter table forecasts add column if not exists po_number text not null default '';`;
  await db`alter table forecasts add column if not exists incoterm text not null default 'EXW';`;
  await db`alter table forecasts add column if not exists ops_action text not null default '';`;
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

  // Logistics fulfillments fields (saved per order line).
  await db`alter table order_progress add column if not exists fulfillment_target_completion text not null default '';`;
  await db`alter table order_progress add column if not exists fulfillment_sales_order_number text not null default '';`;
  await db`alter table order_progress add column if not exists fulfillment_ship_from text not null default '';`;
  await db`alter table order_progress add column if not exists fulfillment_ship_to text not null default '';`;
  await db`alter table order_progress add column if not exists fulfillment_etd date;`;
  await db`alter table order_progress add column if not exists fulfillment_eta date;`;
  await db`alter table order_progress add column if not exists fulfillment_tracking_link text not null default '';`;
  await db`alter table order_progress add column if not exists fulfillment_delivery_status text not null default '';`;
  await db`alter table order_progress add column if not exists fulfillment_mp_batch text not null default '';`;
  await db`alter table order_progress add column if not exists fulfillment_balance_qty integer not null default 0;`;

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
      email text not null default '',
      payment_terms text not null default '',
      lead_time_days integer not null default 0,
      moq integer not null default 0,
      incoterm text not null default '',
      is_active boolean not null default true,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;

  await db`
    create table if not exists buyer_entities (
      code text primary key check (code in ('shenzhen', 'singapore')),
      legal_name text not null default '',
      address text not null default '',
      contact_name text not null default '',
      contact_phone text not null default '',
      email text not null default '',
      company_reg_no text not null default '',
      gst_reg_no text not null default '',
      is_active boolean not null default true,
      updated_by text not null references users(username),
      updated_at timestamptz not null default now()
    );
  `;
  // Seed defaults (idempotent) so UI always has both entities.
  await db`
    insert into buyer_entities (code, legal_name, address, updated_by)
    values
      ('shenzhen', '深圳市伊格鲁科技有限公司', '深圳市宝安区西乡街道共和工业路华丰互联网创意园A座205', 'david'),
      ('singapore', 'Igloocompany Pte Ltd', '71 Ayer Rajah Crescent #01-25, Singapore 139951', 'david')
    on conflict (code) do nothing;
  `;
  await db`alter table suppliers add column if not exists email text not null default '';`;
  await db`alter table suppliers add column if not exists payment_terms text not null default '';`;
  await db`alter table suppliers add column if not exists lead_time_days integer not null default 0;`;
  await db`alter table suppliers add column if not exists moq integer not null default 0;`;
  await db`alter table suppliers add column if not exists incoterm text not null default '';`;
  await db`alter table suppliers add column if not exists is_active boolean not null default true;`;
  await db`alter table suppliers add column if not exists is_domestic_contract boolean not null default false;`;

  // Idempotent seed: known APAC suppliers — CN factories bill in CNY (境内合同); named offshore vendors stay USD.
  await db`
    update suppliers
    set is_domestic_contract = true, updated_at = now()
    where name in ('DKKS', 'HM', 'Huili', 'Jinjian');
  `;
  await db`
    update suppliers
    set is_domestic_contract = false, updated_at = now()
    where name in ('Aztech - Malaysia', 'Raonark - Korea', 'Solity - Korea', 'VS-Malaysia');
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

  await db`
    create index if not exists idx_contracts_order_progress_id on contracts (order_progress_id);
  `;
  await db`alter table contracts drop constraint if exists contracts_po_number_key;`;
  await db`drop index if exists idx_contracts_po_number_unique;`;
  await db`
    create unique index if not exists idx_contracts_po_sku_unique
    on contracts (po_number, sku);
  `;
  await db`drop index if exists idx_contracts_po_sku_unique;`;
  await db`
    create index if not exists idx_contracts_po_sku on contracts (po_number, sku);
  `;
  await db`alter table contracts alter column order_progress_id drop not null;`;
  await db`
    alter table contracts
    add column if not exists forecast_id bigint references forecasts(id) on delete set null;
  `;
  await db`
    alter table contracts
    add column if not exists buyer_entity_code text not null default 'shenzhen';
  `;
  await db`
    create index if not exists idx_contracts_forecast_id on contracts (forecast_id);
  `;
  await db`alter table contracts add column if not exists currency text not null default 'USD';`;
  await db`alter table contracts add column if not exists payment_terms text not null default 'Cash';`;
  await db`alter table contracts add column if not exists remark text not null default '';`;
  await db`alter table contracts add column if not exists delivery_address text not null default '';`;
  await db`alter table contracts add column if not exists unit_cost_quote_id_snapshot bigint;`;
  await db`alter table contracts add column if not exists unit_cost_quote_date_snapshot date;`;
  await db.unsafe(`
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
  await db`alter table contracts drop constraint if exists contracts_status_check;`;
  await db`
    alter table contracts
    add constraint contracts_status_check
    check (status in ('draft', 'approved', 'sent'));
  `;

  await db`
    create table if not exists contract_file_uploads (
      id bigserial primary key,
      po_number text not null,
      sku text not null default '',
      supplier_name text not null default '',
      remark text not null default '',
      signed_date date,
      file_name text not null,
      mime_type text not null,
      file_size integer not null check (file_size > 0 and file_size <= 5242880),
      file_data bytea not null,
      order_progress_id bigint references order_progress(id) on delete set null,
      contract_id bigint references contracts(id) on delete set null,
      uploaded_by text not null references users(username),
      created_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_contract_file_uploads_po
    on contract_file_uploads (po_number);
  `;
  await db`
    create index if not exists idx_contract_file_uploads_created
    on contract_file_uploads (created_at desc);
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
    create table if not exists shipping_reports (
      id bigserial primary key,
      sn text not null default '',
      date_released date,
      consignee_company_name text not null default '',
      do_grn_number text not null default '',
      so_co_reference_number text not null default '',
      pod_link text not null default '',
      sku text not null default '',
      accessory_quantity integer not null default 0 check (accessory_quantity >= 0),
      accessory_number text not null default '',
      request_by text not null default '',
      po_number text not null default '',
      bto_bts text not null default '',
      purpose text not null default '',
      ship_from text not null default '',
      ship_to text not null default '',
      ship_to_region text not null default '',
      shipping_mode text not null default '',
      shipping_method text not null default '',
      tracking_number text not null default '',
      cost_centre text not null default '',
      paid_by_igloo numeric(14, 2) not null default 0,
      paid_by_customer numeric(14, 2) not null default 0,
      sgd_paid_by_igloo numeric(14, 2) not null default 0,
      sgd_paid_by_customer numeric(14, 2) not null default 0,
      usd numeric(14, 2) not null default 0,
      product_serial_no text not null default '',
      remarks text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_shipping_reports_updated
    on shipping_reports (updated_at desc, id desc);
  `;

  await db`
    create table if not exists inventory_global_entries (
      id bigserial primary key,
      main_sku text not null default '',
      variant_sku text not null default '',
      batch text not null default '',
      batch_no_sn text not null default '',
      good_to_release_shipment_from_cm integer not null default 0,
      status text not null default '',
      description text not null default '',
      stock_qty_available_for_fulfillment integer not null default 0,
      reserved_qty integer not null default 0,
      batches_balance_qty integer not null default 0,
      mp_batch_produced_qty integer not null default 0,
      dkks_factory integer not null default 0,
      huili_factory integer not null default 0,
      bolan_factory integer not null default 0,
      jiadun_factory integer not null default 0,
      jinjian_factory integer not null default 0,
      huamei_factory integer not null default 0,
      shenzhen_office integer not null default 0,
      taiwan_fuhshing integer not null default 0,
      singapore_office integer not null default 0,
      cargohub_warehouse integer not null default 0,
      korea_solity_factory integer not null default 0,
      vietnam_solity_factory integer not null default 0,
      aztech_factory integer not null default 0,
      swr_factory integer not null default 0,
      vs_factory integer not null default 0,
      ibe_factory integer not null default 0,
      smart_warehousing integer not null default 0,
      omni_warehouse integer not null default 0,
      amazon_fba integer not null default 0,
      safety_stock_at_amazon integer not null default 0,
      jdm_warehouse integer not null default 0,
      amazon integer not null default 0,
      syw integer not null default 0,
      in_transit_stock integer not null default 0,
      inventory_received_date date,
      aging_days_c integer not null default 0,
      unit_price_rmb numeric(14, 4) not null default 0,
      unit_price_usd numeric(14, 4) not null default 0,
      batches_inventory_cost_usd numeric(16, 2) not null default 0,
      sku_inventory_cost_usd numeric(16, 2) not null default 0,
      china_inventory_cost_usd numeric(16, 2) not null default 0,
      singapore_inventory_cost_usd numeric(16, 2) not null default 0,
      singapore_cargohub_inventory_cost_usd numeric(16, 2) not null default 0,
      korea_solity_inventory_cost numeric(16, 2) not null default 0,
      vietnam_solity_inventory_cost_usd numeric(16, 2) not null default 0,
      usa_omni_inventory_vost_usd numeric(16, 2) not null default 0,
      us_amazon_fba numeric(16, 2) not null default 0,
      europe_jdm_inventory_cost_usd numeric(16, 2) not null default 0,
      in_transit_inventory_cost_usd numeric(16, 2) not null default 0,
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_inventory_global_entries_updated
    on inventory_global_entries (updated_at desc, id desc);
  `;

  await db`
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
  await db`
    create index if not exists idx_logistics_landed_cost_consolidate_created
    on logistics_landed_cost_consolidate (created_at desc, id desc);
  `;
  await db`alter table logistics_landed_cost_consolidate add column if not exists updated_at timestamptz not null default now();`;
  await db`
    create unique index if not exists idx_lcc_po_created_by
    on logistics_landed_cost_consolidate (po_number, created_by);
  `;

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

  await db`
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
  await db`
    create index if not exists idx_unit_cost_quotes_sku_date
    on unit_cost_quotes (sku, quote_date desc, id desc);
  `;
  await db`alter table unit_cost_quotes add column if not exists manufacturer_country text not null default '';`;
  await db`alter table unit_cost_quotes add column if not exists destination_country text not null default '';`;
  await db`alter table unit_cost_quotes add column if not exists destination_tariff_pct numeric(7, 3);`;
  await db`alter table unit_cost_quotes add column if not exists cm_unit_price_tax_rate_pct numeric(7, 3);`;
  await db`alter table unit_cost_quotes add column if not exists sea_freight_unit_price numeric(14, 4);`;
  await db`alter table unit_cost_quotes add column if not exists air_freight_unit_price numeric(14, 4);`;
  await db`alter table unit_cost_quotes add column if not exists incoterm text not null default 'EXW';`;
  await db`alter table unit_cost_quotes add column if not exists creation_reason text not null default '';`;
  await db`alter table unit_cost_quotes add column if not exists deleted_at timestamptz;`;
  await db`alter table unit_cost_quotes add column if not exists deletion_reason text not null default '';`;
  await db`alter table unit_cost_quotes add column if not exists deleted_by text;`;

  await db`
    create table if not exists forecast_cash_flow_settings (
      forecast_id bigint primary key references forecasts(id) on delete cascade,
      supplier_name text not null default '',
      updated_by text not null references users(username),
      updated_at timestamptz not null default now()
    );
  `;
  await db`alter table forecast_cash_flow_settings add column if not exists po_issue_date date;`;
  await db`alter table forecast_cash_flow_settings add column if not exists shipping_mode text not null default 'ocean';`;
  await db`alter table forecast_cash_flow_settings add column if not exists destination_tariff_pct double precision;`;
  await db`alter table forecast_cash_flow_settings add column if not exists freight_usd_per_unit double precision;`;
  await db`alter table forecast_cash_flow_settings add column if not exists cash_flow_incoterm text;`;
  await db`alter table forecast_cash_flow_settings add column if not exists landed_cost_cash_flow_published_at timestamptz;`;
  await db`alter table forecast_cash_flow_settings add column if not exists unit_price_usd_snapshot numeric(14, 4);`;

  await db`
    create table if not exists app_schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    );
  `;
  const fcUnitPriceSnapshotDone = await db<{ id: string }[]>`
    select id from app_schema_migrations where id = 'backfill_fc_unit_price_usd_snapshot_v1' limit 1
  `;
  if (fcUnitPriceSnapshotDone.length === 0) {
    // LATERAL may not reference the UPDATE target alias `s`; use `s2` in FROM so
    // the subquery correlates only to tables listed before the LATERAL (PG 42P10).
    await db`
      update forecast_cash_flow_settings s
      set unit_price_usd_snapshot = q.unit_price
      from forecast_cash_flow_settings s2
      join forecasts f on f.id = s2.forecast_id
      left join lateral (
        select unit_price::numeric as unit_price
        from unit_cost_quotes
        where
          deleted_at is null
          and sku = f.sku
          and trim(supplier_name) = trim(s2.supplier_name)
          and coalesce(trim(s2.supplier_name), '') <> ''
        order by quote_date desc, id desc
        limit 1
      ) q on true
      where
        s.forecast_id = s2.forecast_id
        and s.unit_price_usd_snapshot is null
        and coalesce(trim(s.supplier_name), '') <> ''
        and q.unit_price is not null
    `;
    await db`insert into app_schema_migrations (id) values ('backfill_fc_unit_price_usd_snapshot_v1')`;
  }
  const lccClearDone = await db<{ id: string }[]>`
    select id from app_schema_migrations where id = 'clear_lcc_for_publish_flow' limit 1
  `;
  if (lccClearDone.length === 0) {
    await db`delete from logistics_landed_cost_consolidate`;
    await db`insert into app_schema_migrations (id) values ('clear_lcc_for_publish_flow')`;
  }

  await db`
    create table if not exists npi_bom_entries (
      id bigserial primary key,
      project_name text not null default '',
      sku text not null,
      bom_version text not null default '',
      status text not null default 'draft'
        check (status in ('draft', 'released', 'obsolete')),
      effective_date date,
      component_code text not null default '',
      component_name text not null default '',
      specification text not null default '',
      quantity_per numeric(14, 4) not null default 0,
      uom text not null default 'PCS',
      supplier_name text not null default '',
      unit_cost numeric(14, 4) not null default 0,
      moq integer not null default 0,
      lead_time_days integer not null default 0,
      is_critical boolean not null default false,
      remarks text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_npi_bom_entries_sku
    on npi_bom_entries (sku, id desc);
  `;
  await db`alter table npi_bom_entries add column if not exists project_name text not null default '';`;
  await db`alter table npi_bom_entries add column if not exists bom_version text not null default '';`;
  await db`alter table npi_bom_entries add column if not exists status text not null default 'draft';`;
  await db`alter table npi_bom_entries add column if not exists effective_date date;`;
  await db`alter table npi_bom_entries add column if not exists component_code text not null default '';`;
  await db`alter table npi_bom_entries add column if not exists component_name text not null default '';`;
  await db`alter table npi_bom_entries add column if not exists specification text not null default '';`;
  await db`alter table npi_bom_entries add column if not exists quantity_per numeric(14, 4) not null default 0;`;
  await db`alter table npi_bom_entries add column if not exists uom text not null default 'PCS';`;
  await db`alter table npi_bom_entries add column if not exists supplier_name text not null default '';`;
  await db`alter table npi_bom_entries add column if not exists unit_cost numeric(14, 4) not null default 0;`;
  await db`alter table npi_bom_entries add column if not exists moq integer not null default 0;`;
  await db`alter table npi_bom_entries add column if not exists lead_time_days integer not null default 0;`;
  await db`alter table npi_bom_entries add column if not exists is_critical boolean not null default false;`;
  await db`alter table npi_bom_entries add column if not exists remarks text not null default '';`;
  await db`alter table npi_bom_entries add column if not exists created_by text;`;
  await db`alter table npi_bom_entries add column if not exists created_at timestamptz not null default now();`;
  await db`alter table npi_bom_entries add column if not exists updated_at timestamptz not null default now();`;
  await db`alter table npi_bom_entries drop constraint if exists npi_bom_entries_status_check;`;
  await db`
    alter table npi_bom_entries
    add constraint npi_bom_entries_status_check
    check (status in ('draft', 'released', 'obsolete'));
  `;

  await db`
    create table if not exists npi_tooling_entries (
      id bigserial primary key,
      tooling_code text not null default '',
      tooling_name text not null default '',
      tooling_type text not null default 'fixture'
        check (tooling_type in ('mold', 'fixture', 'gauge', 'tester')),
      related_sku text not null default '',
      cm_name text not null default '',
      location text not null default '',
      status text not null default 'design'
        check (status in ('design', 'in_use', 'maintenance', 'scrapped')),
      owner text not null default '',
      manufacturer text not null default '',
      start_use_date date,
      cycle_count integer not null default 0,
      cycle_limit integer not null default 0,
      last_maintenance_date date,
      next_maintenance_due date,
      cost numeric(14, 2) not null default 0,
      currency text not null default 'USD',
      remarks text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_npi_tooling_entries_code
    on npi_tooling_entries (tooling_code, id desc);
  `;
  await db`alter table npi_tooling_entries add column if not exists tooling_code text not null default '';`;
  await db`alter table npi_tooling_entries add column if not exists tooling_name text not null default '';`;
  await db`alter table npi_tooling_entries add column if not exists tooling_type text not null default 'fixture';`;
  await db`alter table npi_tooling_entries add column if not exists related_sku text not null default '';`;
  await db`alter table npi_tooling_entries add column if not exists cm_name text not null default '';`;
  await db`alter table npi_tooling_entries add column if not exists location text not null default '';`;
  await db`alter table npi_tooling_entries add column if not exists status text not null default 'design';`;
  await db`alter table npi_tooling_entries add column if not exists owner text not null default '';`;
  await db`alter table npi_tooling_entries add column if not exists manufacturer text not null default '';`;
  await db`alter table npi_tooling_entries add column if not exists start_use_date date;`;
  await db`alter table npi_tooling_entries add column if not exists cycle_count integer not null default 0;`;
  await db`alter table npi_tooling_entries add column if not exists cycle_limit integer not null default 0;`;
  await db`alter table npi_tooling_entries add column if not exists last_maintenance_date date;`;
  await db`alter table npi_tooling_entries add column if not exists next_maintenance_due date;`;
  await db`alter table npi_tooling_entries add column if not exists cost numeric(14, 2) not null default 0;`;
  await db`alter table npi_tooling_entries add column if not exists currency text not null default 'USD';`;
  await db`alter table npi_tooling_entries add column if not exists remarks text not null default '';`;
  await db`alter table npi_tooling_entries add column if not exists created_by text;`;
  await db`alter table npi_tooling_entries add column if not exists created_at timestamptz not null default now();`;
  await db`alter table npi_tooling_entries add column if not exists updated_at timestamptz not null default now();`;
  await db`alter table npi_tooling_entries drop constraint if exists npi_tooling_entries_tooling_type_check;`;
  await db`alter table npi_tooling_entries drop constraint if exists npi_tooling_entries_status_check;`;
  await db`
    alter table npi_tooling_entries
    add constraint npi_tooling_entries_tooling_type_check
    check (tooling_type in ('mold', 'fixture', 'gauge', 'tester'));
  `;
  await db`
    alter table npi_tooling_entries
    add constraint npi_tooling_entries_status_check
    check (status in ('design', 'in_use', 'maintenance', 'scrapped'));
  `;

  await db`
    create table if not exists npi_ecn_entries (
      id bigserial primary key,
      ecn_no text not null default '',
      title text not null default '',
      status text not null default 'draft'
        check (status in ('draft', 'under_review', 'approved', 'implemented', 'rejected')),
      priority text not null default 'medium'
        check (priority in ('low', 'medium', 'high')),
      requester text not null default '',
      owner text not null default '',
      target_effective_date date,
      actual_effective_date date,
      affected_skus text not null default '',
      impact_summary text not null default '',
      reason text not null default '',
      remarks text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_npi_ecn_entries_ecn_no
    on npi_ecn_entries (ecn_no, id desc);
  `;
  await db`alter table npi_ecn_entries add column if not exists ecn_no text not null default '';`;
  await db`alter table npi_ecn_entries add column if not exists title text not null default '';`;
  await db`alter table npi_ecn_entries add column if not exists status text not null default 'draft';`;
  await db`alter table npi_ecn_entries add column if not exists priority text not null default 'medium';`;
  await db`alter table npi_ecn_entries add column if not exists requester text not null default '';`;
  await db`alter table npi_ecn_entries add column if not exists owner text not null default '';`;
  await db`alter table npi_ecn_entries add column if not exists target_effective_date date;`;
  await db`alter table npi_ecn_entries add column if not exists actual_effective_date date;`;
  await db`alter table npi_ecn_entries add column if not exists affected_skus text not null default '';`;
  await db`alter table npi_ecn_entries add column if not exists impact_summary text not null default '';`;
  await db`alter table npi_ecn_entries add column if not exists reason text not null default '';`;
  await db`alter table npi_ecn_entries add column if not exists remarks text not null default '';`;
  await db`alter table npi_ecn_entries add column if not exists created_by text;`;
  await db`alter table npi_ecn_entries add column if not exists created_at timestamptz not null default now();`;
  await db`alter table npi_ecn_entries add column if not exists updated_at timestamptz not null default now();`;
  await db`alter table npi_ecn_entries drop constraint if exists npi_ecn_entries_status_check;`;
  await db`alter table npi_ecn_entries drop constraint if exists npi_ecn_entries_priority_check;`;
  await db`
    alter table npi_ecn_entries
    add constraint npi_ecn_entries_status_check
    check (status in ('draft', 'under_review', 'approved', 'implemented', 'rejected'));
  `;
  await db`
    alter table npi_ecn_entries
    add constraint npi_ecn_entries_priority_check
    check (priority in ('low', 'medium', 'high'));
  `;

  await db`
    create table if not exists npi_sop_entries (
      id bigserial primary key,
      sop_no text not null default '',
      title text not null default '',
      product_line text not null default '',
      sku text not null default '',
      process_step text not null default '',
      workstation text not null default '',
      owner text not null default '',
      reviewer text not null default '',
      approver text not null default '',
      status text not null default 'draft'
        check (status in ('draft', 'in_review', 'released', 'obsolete')),
      version text not null default 'V1.0',
      effective_date date,
      training_required boolean not null default false,
      safety_notes text not null default '',
      key_ctq text not null default '',
      control_method text not null default '',
      attachment_url text not null default '',
      remarks text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_npi_sop_entries_sop_no
    on npi_sop_entries (sop_no, id desc);
  `;

  await db`
    create table if not exists qc_test_cases (
      id bigserial primary key,
      test_case_id text not null default '',
      title text not null default '',
      product_sku text not null default '',
      firmware_version text not null default '',
      module_name text not null default '',
      category text not null default 'functional'
        check (category in ('functional', 'security', 'reliability', 'compatibility', 'ota', 'performance')),
      priority text not null default 'P1'
        check (priority in ('P0', 'P1', 'P2')),
      status text not null default 'draft'
        check (status in ('draft', 'reviewed', 'released', 'obsolete')),
      preconditions text not null default '',
      steps text not null default '',
      expected_result text not null default '',
      environment text not null default '',
      owner text not null default '',
      remarks text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`create index if not exists idx_qc_test_cases_case_id on qc_test_cases (test_case_id, id desc);`;

  await db`
    create table if not exists qc_certifications (
      id bigserial primary key,
      certificate_no text not null default '',
      product_sku text not null default '',
      product_name text not null default '',
      region text not null default '',
      standard_name text not null default '',
      cert_body text not null default '',
      status text not null default 'planning'
        check (status in ('planning', 'in_progress', 'approved', 'expired', 'withdrawn')),
      application_date date,
      issue_date date,
      expiry_date date,
      report_url text not null default '',
      owner text not null default '',
      notes text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`create index if not exists idx_qc_certifications_cert_no on qc_certifications (certificate_no, id desc);`;

  await db`
    create table if not exists qc_ort_reports (
      id bigserial primary key,
      ort_no text not null default '',
      product_sku text not null default '',
      batch_no text not null default '',
      factory text not null default '',
      sample_size integer not null default 0,
      test_items text not null default '',
      environment_profile text not null default '',
      duration text not null default '',
      result_summary text not null default 'on_going'
        check (result_summary in ('on_going', 'pass', 'fail')),
      fail_count integer not null default 0,
      fail_modes text not null default '',
      action_taken text not null default '',
      owner text not null default '',
      start_date date,
      end_date date,
      report_url text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`create index if not exists idx_qc_ort_reports_ort_no on qc_ort_reports (ort_no, id desc);`;

  await db`
    create table if not exists qc_8d_reports (
      id bigserial primary key,
      report_no text not null default '',
      issue_title text not null default '',
      product_sku text not null default '',
      customer text not null default '',
      region text not null default '',
      severity text not null default 'S3'
        check (severity in ('S1', 'S2', 'S3', 'S4')),
      status text not null default 'open'
        check (status in ('open', 'containment', 'root_caused', 'implemented', 'verified', 'closed')),
      owner text not null default '',
      d3_containment text not null default '',
      d4_root_cause text not null default '',
      d5_corrective_action text not null default '',
      d6_implementation_plan text not null default '',
      date_opened date,
      date_closed date,
      affected_quantity integer not null default 0,
      cost_impact numeric(14, 2) not null default 0,
      remarks text not null default '',
      created_by text not null references users(username),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`create index if not exists idx_qc_8d_reports_report_no on qc_8d_reports (report_no, id desc);`;

  await db`
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
  await db`
    create index if not exists idx_mass_production_kanban_region_updated
    on mass_production_kanban (region, updated_at desc);
  `;
  await db`alter table mass_production_kanban add column if not exists ort_date date;`;
  await db`
    alter table mass_production_kanban
    drop constraint if exists mass_production_kanban_region_check;
  `;
  await db`
    alter table mass_production_kanban
    add constraint mass_production_kanban_region_check
    check (region in ('APAC', 'EU', 'US', 'Shenzhen office'));
  `;

  await db`
    create table if not exists ecn_approval_requests (
      id bigserial primary key,
      ecn_no text not null unique,
      status text not null default 'draft'
        check (status in ('draft', 'under_review', 'approved', 'rejected')),
      sku text not null,
      product_name text not null default '',
      variant text not null default '',
      change_team text not null
        check (change_team in ('me', 'ee', 'fw')),
      change_reason text not null default '',
      jira_links text not null default '',
      import_batch text not null default '',
      material_stock_disposition text not null
        check (material_stock_disposition in ('keep_until_exhausted', 'rework', 'discard', 'per_comments')),
      production_line_disposition text not null
        check (production_line_disposition in ('keep_producing', 'change_material', 'per_comments')),
      finished_goods_disposition text not null
        check (finished_goods_disposition in ('keep_using', 'rework', 'discard', 'per_comments')),
      comments text not null default '',
      production_files_url text not null default '',
      approval_department text not null
        check (approval_department in ('ee_me', 'project', 'operations')),
      created_by text not null references users(username),
      submitted_at timestamptz,
      rejected_by text references users(username),
      rejection_reason text not null default '',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_ecn_approval_requests_status
    on ecn_approval_requests (status, updated_at desc);
  `;
  await db`
    create index if not exists idx_ecn_approval_requests_ecn_no
    on ecn_approval_requests (ecn_no);
  `;

  await db`
    create table if not exists ecn_approval_attachments (
      id bigserial primary key,
      request_id bigint not null references ecn_approval_requests(id) on delete cascade,
      file_name text not null,
      mime_type text not null,
      file_size integer not null check (file_size > 0 and file_size <= 5242880),
      file_data bytea not null,
      uploaded_by text not null references users(username),
      created_at timestamptz not null default now()
    );
  `;
  await db`
    create index if not exists idx_ecn_approval_attachments_request
    on ecn_approval_attachments (request_id);
  `;

  await db`
    create table if not exists ecn_approval_signoffs (
      id bigserial primary key,
      request_id bigint not null references ecn_approval_requests(id) on delete cascade,
      approver_username text not null references users(username),
      decision text not null default 'pending'
        check (decision in ('pending', 'approved', 'rejected')),
      comment text not null default '',
      decided_at timestamptz,
      unique (request_id, approver_username)
    );
  `;
}

async function seedUsers() {
  const db = getSql();
  const syncSeedPasswords =
    process.env.SEED_SYNC_PASSWORDS === "1" ||
    process.env.SEED_SYNC_PASSWORDS === "true";

  for (const account of USER_ACCOUNTS) {
    const passwordHash = hashPassword(account.password);
    if (syncSeedPasswords) {
      await db`
        insert into users (username, password_hash, display_name, role)
        values (
          ${account.username},
          ${passwordHash},
          ${account.displayName},
          ${account.role}
        )
        on conflict (username) do update
        set
          password_hash = excluded.password_hash,
          display_name = excluded.display_name,
          role = excluded.role;
      `;
    } else {
      await db`
        insert into users (username, password_hash, display_name, role)
        values (
          ${account.username},
          ${passwordHash},
          ${account.displayName},
          ${account.role}
        )
        on conflict (username) do update
        set
          display_name = excluded.display_name,
          role = excluded.role;
      `;
    }

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

  if (appliedSchemaVersion >= CURRENT_SCHEMA_VERSION) {
    return;
  }

  // Opt-out for dev: skip the ~150 idempotent CREATE/ALTER statements on cold start.
  // Run `npm run db:init` deliberately when you pull a branch that changes schema.
  if (process.env.SKIP_RUNTIME_BOOTSTRAP === "1") {
    appliedSchemaVersion = CURRENT_SCHEMA_VERSION;
    return;
  }

  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        await setupSchema();
        await seedUsers();
        await seedOffices();
        appliedSchemaVersion = CURRENT_SCHEMA_VERSION;
      } catch (err) {
        bootstrapPromise = null;
        throw err;
      }
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
