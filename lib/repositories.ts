import { ensureDatabase, getSql } from "@/lib/db";
import { forecastPoPrefixForRegion, singaporeYmdCompact } from "@/lib/forecast-po";
import type { ParsedOrderProgressDeliveryPlan } from "@/lib/order-progress-delivery-plans";
import { hashPassword, verifyPassword } from "@/lib/security";
import {
  AdminAuditLog,
  AdminUser,
  BomEntry,
  BomStatus,
  EcnEntry,
  EcnPriority,
  EcnStatus,
  ForecastEntry,
  LogisticsLocation,
  LogisticsMovementType,
  LogisticsShipmentEntry,
  LogisticsShipmentStatus,
  CostAnalysisEntry,
  CostFreightMode,
  CashFlowEntry,
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
  MassProductionKanbanEntry,
  ProductItem,
  Region,
  SessionPayload,
  SopEntry,
  SopStatus,
  ShippingReportEntry,
  InventoryGlobalEntry,
  SupplierEntry,
  ToolingEntry,
  ToolingStatus,
  ToolingType,
  Qc8dReportEntry,
  Qc8dSeverity,
  Qc8dStatus,
  QcCertificationEntry,
  QcCertificationStatus,
  QcOrtReportEntry,
  QcOrtResult,
  QcTestCaseCategory,
  QcTestCaseEntry,
  QcTestCasePriority,
  QcTestCaseStatus,
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
  email: string;
  payment_terms: string;
  lead_time_days: number;
  moq: number;
  incoterm: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type BomRow = {
  id: number;
  project_name: string;
  sku: string;
  bom_version: string;
  status: BomStatus;
  effective_date: string | null;
  component_code: string;
  component_name: string;
  specification: string;
  quantity_per: string | number;
  uom: string;
  supplier_name: string;
  unit_cost: string | number;
  moq: number;
  lead_time_days: number;
  is_critical: boolean;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type ToolingRow = {
  id: number;
  tooling_code: string;
  tooling_name: string;
  tooling_type: ToolingType;
  related_sku: string;
  cm_name: string;
  location: string;
  status: ToolingStatus;
  owner: string;
  manufacturer: string;
  start_use_date: string | null;
  cycle_count: number;
  cycle_limit: number;
  last_maintenance_date: string | null;
  next_maintenance_due: string | null;
  cost: string | number;
  currency: string;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type EcnRow = {
  id: number;
  ecn_no: string;
  title: string;
  status: EcnStatus;
  priority: EcnPriority;
  requester: string;
  owner: string;
  target_effective_date: string | null;
  actual_effective_date: string | null;
  affected_skus: string;
  impact_summary: string;
  reason: string;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type SopRow = {
  id: number;
  sop_no: string;
  title: string;
  product_line: string;
  sku: string;
  process_step: string;
  workstation: string;
  owner: string;
  reviewer: string;
  approver: string;
  status: SopStatus;
  version: string;
  effective_date: string | null;
  training_required: boolean;
  safety_notes: string;
  key_ctq: string;
  control_method: string;
  attachment_url: string;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type QcTestCaseRow = {
  id: number;
  test_case_id: string;
  title: string;
  product_sku: string;
  firmware_version: string;
  module_name: string;
  category: QcTestCaseCategory;
  priority: QcTestCasePriority;
  status: QcTestCaseStatus;
  preconditions: string;
  steps: string;
  expected_result: string;
  environment: string;
  owner: string;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type QcCertificationRow = {
  id: number;
  certificate_no: string;
  product_sku: string;
  product_name: string;
  region: string;
  standard_name: string;
  cert_body: string;
  status: QcCertificationStatus;
  application_date: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  report_url: string;
  owner: string;
  notes: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type QcOrtReportRow = {
  id: number;
  ort_no: string;
  product_sku: string;
  batch_no: string;
  factory: string;
  sample_size: number;
  test_items: string;
  environment_profile: string;
  duration: string;
  result_summary: QcOrtResult;
  fail_count: number;
  fail_modes: string;
  action_taken: string;
  owner: string;
  start_date: string | null;
  end_date: string | null;
  report_url: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type Qc8dReportRow = {
  id: number;
  report_no: string;
  issue_title: string;
  product_sku: string;
  customer: string;
  region: string;
  severity: Qc8dSeverity;
  status: Qc8dStatus;
  owner: string;
  d3_containment: string;
  d4_root_cause: string;
  d5_corrective_action: string;
  d6_implementation_plan: string;
  date_opened: string | null;
  date_closed: string | null;
  affected_quantity: number;
  cost_impact: string | number;
  remarks: string;
  created_by: string;
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

type MassProductionKanbanRow = {
  id: number;
  product_id: number;
  product_name: string;
  sku: string;
  variant: string;
  quantity: number;
  mp: string;
  ee_date: string | null;
  me_date: string | null;
  smt_date: string | null;
  assembly_date: string | null;
  production_report_date: string | null;
  coo_approval_date: string | null;
  deliver_date: string | null;
  region: OrderProgressRegion;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapMassProductionKanbanRow(row: MassProductionKanbanRow): MassProductionKanbanEntry {
  const d = (v: string | null) => (v && String(v).trim() ? String(v).slice(0, 10) : null);
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productName: row.product_name,
    sku: row.sku,
    variant: row.variant,
    quantity: Number(row.quantity),
    mp: row.mp ?? "",
    ee: d(row.ee_date),
    me: d(row.me_date),
    smt: d(row.smt_date),
    assembly: d(row.assembly_date),
    productionReport: d(row.production_report_date),
    cooApproval: d(row.coo_approval_date),
    deliver: d(row.deliver_date),
    region: row.region,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMassProductionKanbanBySessionRegions(
  regions: Region[],
): Promise<MassProductionKanbanEntry[]> {
  await ensureDatabase();
  const allowed = orderProgressRegionsForSession(regions);
  if (allowed.length === 0) return [];
  const db = getSql();
  const rows = await db<MassProductionKanbanRow[]>`
    select
      k.id,
      k.product_id,
      p.product_name,
      p.sku,
      p.variant,
      k.quantity,
      k.mp,
      k.ee_date::text,
      k.me_date::text,
      k.smt_date::text,
      k.assembly_date::text,
      k.production_report_date::text,
      k.coo_approval_date::text,
      k.deliver_date::text,
      k.region,
      k.created_by,
      k.created_at::text,
      k.updated_at::text
    from mass_production_kanban k
    join products p on p.id = k.product_id
    where k.region = any(${allowed})
    order by k.updated_at desc, k.id desc;
  `;
  return rows.map(mapMassProductionKanbanRow);
}

export async function getMassProductionKanbanById(id: string): Promise<MassProductionKanbanEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<MassProductionKanbanRow[]>`
    select
      k.id,
      k.product_id,
      p.product_name,
      p.sku,
      p.variant,
      k.quantity,
      k.mp,
      k.ee_date::text,
      k.me_date::text,
      k.smt_date::text,
      k.assembly_date::text,
      k.production_report_date::text,
      k.coo_approval_date::text,
      k.deliver_date::text,
      k.region,
      k.created_by,
      k.created_at::text,
      k.updated_at::text
    from mass_production_kanban k
    join products p on p.id = k.product_id
    where k.id = ${Number(id)}
    limit 1;
  `;
  return rows[0] ? mapMassProductionKanbanRow(rows[0]) : null;
}

export async function createMassProductionKanban(input: {
  productId: string;
  quantity: number;
  mp: string;
  ee: string | null;
  me: string | null;
  smt: string | null;
  assembly: string | null;
  productionReport: string | null;
  cooApproval: string | null;
  deliver: string | null;
  region: OrderProgressRegion;
  createdBy: string;
}): Promise<MassProductionKanbanEntry> {
  await ensureDatabase();
  const db = getSql();
  const product = await findProductById(input.productId);
  if (!product || !product.isActive) {
    throw new Error("Product not found or inactive");
  }
  const inserted = await db<{ id: number }[]>`
    insert into mass_production_kanban (
      product_id,
      quantity,
      mp,
      ee_date,
      me_date,
      smt_date,
      assembly_date,
      production_report_date,
      coo_approval_date,
      deliver_date,
      region,
      created_by
    )
    values (
      ${Number(input.productId)},
      ${input.quantity},
      ${input.mp.slice(0, 2000)},
      ${input.ee},
      ${input.me},
      ${input.smt},
      ${input.assembly},
      ${input.productionReport},
      ${input.cooApproval},
      ${input.deliver},
      ${input.region},
      ${input.createdBy}
    )
    returning id;
  `;
  const newId = inserted[0]?.id;
  if (newId == null) throw new Error("Insert failed");
  const created = await getMassProductionKanbanById(String(newId));
  if (!created) throw new Error("Load failed");
  return created;
}

export async function updateMassProductionKanban(input: {
  id: string;
  productId: string;
  quantity: number;
  mp: string;
  ee: string | null;
  me: string | null;
  smt: string | null;
  assembly: string | null;
  productionReport: string | null;
  cooApproval: string | null;
  deliver: string | null;
  region: OrderProgressRegion;
}): Promise<MassProductionKanbanEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const product = await findProductById(input.productId);
  if (!product || !product.isActive) {
    throw new Error("Product not found or inactive");
  }
  const updated = await db<{ id: number }[]>`
    update mass_production_kanban
    set
      product_id = ${Number(input.productId)},
      quantity = ${input.quantity},
      mp = ${input.mp.slice(0, 2000)},
      ee_date = ${input.ee},
      me_date = ${input.me},
      smt_date = ${input.smt},
      assembly_date = ${input.assembly},
      production_report_date = ${input.productionReport},
      coo_approval_date = ${input.cooApproval},
      deliver_date = ${input.deliver},
      region = ${input.region},
      updated_at = now()
    where id = ${Number(input.id)}
    returning id;
  `;
  if (!updated[0]) return null;
  return getMassProductionKanbanById(input.id);
}

export async function deleteMassProductionKanbanById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from mass_production_kanban where id = ${Number(id)};`;
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

type ShippingReportRow = {
  id: number;
  sn: string;
  date_released: string | null;
  consignee_company_name: string;
  do_grn_number: string;
  so_co_reference_number: string;
  pod_link: string;
  sku: string;
  accessory_quantity: number;
  accessory_number: string;
  request_by: string;
  po_number: string;
  bto_bts: string;
  purpose: string;
  ship_from: string;
  ship_to: string;
  ship_to_region: string;
  shipping_mode: string;
  shipping_method: string;
  tracking_number: string;
  cost_centre: string;
  paid_by_igloo: string | number;
  paid_by_customer: string | number;
  sgd_paid_by_igloo: string | number;
  sgd_paid_by_customer: string | number;
  usd: string | number;
  product_serial_no: string;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

type InventoryGlobalRow = {
  id: number;
  main_sku: string;
  variant_sku: string;
  batch: string;
  batch_no_sn: string;
  good_to_release_shipment_from_cm: number;
  status: string;
  description: string;
  stock_qty_available_for_fulfillment: number;
  reserved_qty: number;
  batches_balance_qty: number;
  mp_batch_produced_qty: number;
  dkks_factory: number;
  huili_factory: number;
  bolan_factory: number;
  jiadun_factory: number;
  jinjian_factory: number;
  huamei_factory: number;
  shenzhen_office: number;
  taiwan_fuhshing: number;
  singapore_office: number;
  cargohub_warehouse: number;
  korea_solity_factory: number;
  vietnam_solity_factory: number;
  aztech_factory: number;
  swr_factory: number;
  vs_factory: number;
  ibe_factory: number;
  smart_warehousing: number;
  omni_warehouse: number;
  amazon_fba: number;
  safety_stock_at_amazon: number;
  jdm_warehouse: number;
  amazon: number;
  syw: number;
  in_transit_stock: number;
  inventory_received_date: string | null;
  aging_days_c: number;
  unit_price_rmb: string | number;
  unit_price_usd: string | number;
  batches_inventory_cost_usd: string | number;
  sku_inventory_cost_usd: string | number;
  china_inventory_cost_usd: string | number;
  singapore_inventory_cost_usd: string | number;
  singapore_cargohub_inventory_cost_usd: string | number;
  korea_solity_inventory_cost: string | number;
  vietnam_solity_inventory_cost_usd: string | number;
  usa_omni_inventory_vost_usd: string | number;
  us_amazon_fba: string | number;
  europe_jdm_inventory_cost_usd: string | number;
  in_transit_inventory_cost_usd: string | number;
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

function mapShippingReport(row: ShippingReportRow): ShippingReportEntry {
  return {
    id: String(row.id),
    sn: row.sn || "",
    dateReleased: row.date_released ? formatPgDateOnly(row.date_released) : null,
    consigneeCompanyName: row.consignee_company_name || "",
    doGrnNumber: row.do_grn_number || "",
    soCoReferenceNumber: row.so_co_reference_number || "",
    podLink: row.pod_link || "",
    sku: row.sku || "",
    accessoryQuantity: Number(row.accessory_quantity ?? 0),
    accessoryNumber: row.accessory_number || "",
    requestBy: row.request_by || "",
    poNumber: row.po_number || "",
    btoBts: row.bto_bts || "",
    purpose: row.purpose || "",
    shipFrom: row.ship_from || "",
    shipTo: row.ship_to || "",
    shipToRegion: row.ship_to_region || "",
    shippingMode: row.shipping_mode || "",
    shippingMethod: row.shipping_method || "",
    trackingNumber: row.tracking_number || "",
    costCentre: row.cost_centre || "",
    paidByIgloo: Number(row.paid_by_igloo ?? 0),
    paidByCustomer: Number(row.paid_by_customer ?? 0),
    sgdPaidByIgloo: Number(row.sgd_paid_by_igloo ?? 0),
    sgdPaidByCustomer: Number(row.sgd_paid_by_customer ?? 0),
    usd: Number(row.usd ?? 0),
    productSerialNo: row.product_serial_no || "",
    remarks: row.remarks || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listShippingReports(): Promise<ShippingReportEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ShippingReportRow[]>`
    select
      id, sn, date_released::text, consignee_company_name, do_grn_number, so_co_reference_number,
      pod_link, sku, accessory_quantity, accessory_number, request_by, po_number, bto_bts, purpose,
      ship_from, ship_to, ship_to_region, shipping_mode, shipping_method, tracking_number, cost_centre,
      paid_by_igloo::text, paid_by_customer::text, sgd_paid_by_igloo::text, sgd_paid_by_customer::text, usd::text,
      product_serial_no, remarks, created_by, created_at::text, updated_at::text
    from shipping_reports
    order by updated_at desc, id desc
    limit 1000;
  `;
  return rows.map(mapShippingReport);
}

export async function getShippingReportById(id: string): Promise<ShippingReportEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ShippingReportRow[]>`
    select
      id, sn, date_released::text, consignee_company_name, do_grn_number, so_co_reference_number,
      pod_link, sku, accessory_quantity, accessory_number, request_by, po_number, bto_bts, purpose,
      ship_from, ship_to, ship_to_region, shipping_mode, shipping_method, tracking_number, cost_centre,
      paid_by_igloo::text, paid_by_customer::text, sgd_paid_by_igloo::text, sgd_paid_by_customer::text, usd::text,
      product_serial_no, remarks, created_by, created_at::text, updated_at::text
    from shipping_reports
    where id = ${Number(id)}
    limit 1;
  `;
  return rows[0] ? mapShippingReport(rows[0]) : null;
}

export async function createShippingReport(input: Omit<ShippingReportEntry, "id" | "createdAt" | "updatedAt">): Promise<ShippingReportEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ShippingReportRow[]>`
    insert into shipping_reports (
      sn, date_released, consignee_company_name, do_grn_number, so_co_reference_number, pod_link,
      sku, accessory_quantity, accessory_number, request_by, po_number, bto_bts, purpose,
      ship_from, ship_to, ship_to_region, shipping_mode, shipping_method, tracking_number, cost_centre,
      paid_by_igloo, paid_by_customer, sgd_paid_by_igloo, sgd_paid_by_customer, usd,
      product_serial_no, remarks, created_by
    ) values (
      ${input.sn.trim()}, ${input.dateReleased}, ${input.consigneeCompanyName.trim()}, ${input.doGrnNumber.trim()},
      ${input.soCoReferenceNumber.trim()}, ${input.podLink.trim()}, ${input.sku.trim()},
      ${Math.max(0, Math.trunc(input.accessoryQuantity))}, ${input.accessoryNumber.trim()}, ${input.requestBy.trim()},
      ${input.poNumber.trim()}, ${input.btoBts.trim()}, ${input.purpose.trim()}, ${input.shipFrom.trim()},
      ${input.shipTo.trim()}, ${input.shipToRegion.trim()}, ${input.shippingMode.trim()}, ${input.shippingMethod.trim()},
      ${input.trackingNumber.trim()}, ${input.costCentre.trim()}, ${Math.max(0, input.paidByIgloo)},
      ${Math.max(0, input.paidByCustomer)}, ${Math.max(0, input.sgdPaidByIgloo)},
      ${Math.max(0, input.sgdPaidByCustomer)}, ${Math.max(0, input.usd)}, ${input.productSerialNo.trim()},
      ${input.remarks.trim()}, ${input.createdBy}
    )
    returning
      id, sn, date_released::text, consignee_company_name, do_grn_number, so_co_reference_number,
      pod_link, sku, accessory_quantity, accessory_number, request_by, po_number, bto_bts, purpose,
      ship_from, ship_to, ship_to_region, shipping_mode, shipping_method, tracking_number, cost_centre,
      paid_by_igloo::text, paid_by_customer::text, sgd_paid_by_igloo::text, sgd_paid_by_customer::text, usd::text,
      product_serial_no, remarks, created_by, created_at::text, updated_at::text;
  `;
  return mapShippingReport(rows[0]);
}

export async function updateShippingReport(input: Omit<ShippingReportEntry, "createdAt" | "updatedAt">): Promise<ShippingReportEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ShippingReportRow[]>`
    update shipping_reports
    set
      sn = ${input.sn.trim()},
      date_released = ${input.dateReleased},
      consignee_company_name = ${input.consigneeCompanyName.trim()},
      do_grn_number = ${input.doGrnNumber.trim()},
      so_co_reference_number = ${input.soCoReferenceNumber.trim()},
      pod_link = ${input.podLink.trim()},
      sku = ${input.sku.trim()},
      accessory_quantity = ${Math.max(0, Math.trunc(input.accessoryQuantity))},
      accessory_number = ${input.accessoryNumber.trim()},
      request_by = ${input.requestBy.trim()},
      po_number = ${input.poNumber.trim()},
      bto_bts = ${input.btoBts.trim()},
      purpose = ${input.purpose.trim()},
      ship_from = ${input.shipFrom.trim()},
      ship_to = ${input.shipTo.trim()},
      ship_to_region = ${input.shipToRegion.trim()},
      shipping_mode = ${input.shippingMode.trim()},
      shipping_method = ${input.shippingMethod.trim()},
      tracking_number = ${input.trackingNumber.trim()},
      cost_centre = ${input.costCentre.trim()},
      paid_by_igloo = ${Math.max(0, input.paidByIgloo)},
      paid_by_customer = ${Math.max(0, input.paidByCustomer)},
      sgd_paid_by_igloo = ${Math.max(0, input.sgdPaidByIgloo)},
      sgd_paid_by_customer = ${Math.max(0, input.sgdPaidByCustomer)},
      usd = ${Math.max(0, input.usd)},
      product_serial_no = ${input.productSerialNo.trim()},
      remarks = ${input.remarks.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id, sn, date_released::text, consignee_company_name, do_grn_number, so_co_reference_number,
      pod_link, sku, accessory_quantity, accessory_number, request_by, po_number, bto_bts, purpose,
      ship_from, ship_to, ship_to_region, shipping_mode, shipping_method, tracking_number, cost_centre,
      paid_by_igloo::text, paid_by_customer::text, sgd_paid_by_igloo::text, sgd_paid_by_customer::text, usd::text,
      product_serial_no, remarks, created_by, created_at::text, updated_at::text;
  `;
  return rows[0] ? mapShippingReport(rows[0]) : null;
}

export async function deleteShippingReportById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from shipping_reports where id = ${Number(id)};`;
}

function mapInventoryGlobal(row: InventoryGlobalRow): InventoryGlobalEntry {
  return {
    id: String(row.id),
    mainSku: row.main_sku || "",
    variantSku: row.variant_sku || "",
    batch: row.batch || "",
    batchNoSn: row.batch_no_sn || "",
    goodToReleaseShipmentFromCm: Number(row.good_to_release_shipment_from_cm ?? 0),
    status: row.status || "",
    description: row.description || "",
    stockQtyAvailableForFulfillment: Number(row.stock_qty_available_for_fulfillment ?? 0),
    reservedQty: Number(row.reserved_qty ?? 0),
    batchesBalanceQty: Number(row.batches_balance_qty ?? 0),
    mpBatchProducedQty: Number(row.mp_batch_produced_qty ?? 0),
    dkksFactory: Number(row.dkks_factory ?? 0),
    huiliFactory: Number(row.huili_factory ?? 0),
    bolanFactory: Number(row.bolan_factory ?? 0),
    jiadunFactory: Number(row.jiadun_factory ?? 0),
    jinjianFactory: Number(row.jinjian_factory ?? 0),
    huameiFactory: Number(row.huamei_factory ?? 0),
    shenzhenOffice: Number(row.shenzhen_office ?? 0),
    taiwanFuhshing: Number(row.taiwan_fuhshing ?? 0),
    singaporeOffice: Number(row.singapore_office ?? 0),
    cargohubWarehouse: Number(row.cargohub_warehouse ?? 0),
    koreaSolityFactory: Number(row.korea_solity_factory ?? 0),
    vietnamSolityFactory: Number(row.vietnam_solity_factory ?? 0),
    aztechFactory: Number(row.aztech_factory ?? 0),
    swrFactory: Number(row.swr_factory ?? 0),
    vsFactory: Number(row.vs_factory ?? 0),
    ibeFactory: Number(row.ibe_factory ?? 0),
    smartWarehousing: Number(row.smart_warehousing ?? 0),
    omniWarehouse: Number(row.omni_warehouse ?? 0),
    amazonFba: Number(row.amazon_fba ?? 0),
    safetyStockAtAmazon: Number(row.safety_stock_at_amazon ?? 0),
    jdmWarehouse: Number(row.jdm_warehouse ?? 0),
    amazon: Number(row.amazon ?? 0),
    syw: Number(row.syw ?? 0),
    inTransitStock: Number(row.in_transit_stock ?? 0),
    inventoryReceivedDate: row.inventory_received_date ? formatPgDateOnly(row.inventory_received_date) : null,
    agingDaysC: Number(row.aging_days_c ?? 0),
    unitPriceRmb: Number(row.unit_price_rmb ?? 0),
    unitPriceUsd: Number(row.unit_price_usd ?? 0),
    batchesInventoryCostUsd: Number(row.batches_inventory_cost_usd ?? 0),
    skuInventoryCostUsd: Number(row.sku_inventory_cost_usd ?? 0),
    chinaInventoryCostUsd: Number(row.china_inventory_cost_usd ?? 0),
    singaporeInventoryCostUsd: Number(row.singapore_inventory_cost_usd ?? 0),
    singaporeCargohubInventoryCostUsd: Number(row.singapore_cargohub_inventory_cost_usd ?? 0),
    koreaSolityInventoryCost: Number(row.korea_solity_inventory_cost ?? 0),
    vietnamSolityInventoryCostUsd: Number(row.vietnam_solity_inventory_cost_usd ?? 0),
    usaOmniInventoryVostUsd: Number(row.usa_omni_inventory_vost_usd ?? 0),
    usAmazonFba: Number(row.us_amazon_fba ?? 0),
    europeJdmInventoryCostUsd: Number(row.europe_jdm_inventory_cost_usd ?? 0),
    inTransitInventoryCostUsd: Number(row.in_transit_inventory_cost_usd ?? 0),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const INVENTORY_GLOBAL_SELECT = `
  id, main_sku, variant_sku, batch, batch_no_sn, good_to_release_shipment_from_cm, status, description,
  stock_qty_available_for_fulfillment, reserved_qty, batches_balance_qty, mp_batch_produced_qty, dkks_factory,
  huili_factory, bolan_factory, jiadun_factory, jinjian_factory, huamei_factory, shenzhen_office, taiwan_fuhshing,
  singapore_office, cargohub_warehouse, korea_solity_factory, vietnam_solity_factory, aztech_factory, swr_factory,
  vs_factory, ibe_factory, smart_warehousing, omni_warehouse, amazon_fba, safety_stock_at_amazon, jdm_warehouse,
  amazon, syw, in_transit_stock, inventory_received_date::text, aging_days_c, unit_price_rmb::text, unit_price_usd::text,
  batches_inventory_cost_usd::text, sku_inventory_cost_usd::text, china_inventory_cost_usd::text, singapore_inventory_cost_usd::text,
  singapore_cargohub_inventory_cost_usd::text, korea_solity_inventory_cost::text, vietnam_solity_inventory_cost_usd::text,
  usa_omni_inventory_vost_usd::text, us_amazon_fba::text, europe_jdm_inventory_cost_usd::text, in_transit_inventory_cost_usd::text,
  created_by, created_at::text, updated_at::text
`;

export async function listInventoryGlobalEntries(): Promise<InventoryGlobalEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<InventoryGlobalRow[]>`
    select ${db.unsafe(INVENTORY_GLOBAL_SELECT)}
    from inventory_global_entries
    order by updated_at desc, id desc
    limit 1000;
  `;
  return rows.map(mapInventoryGlobal);
}

export async function getInventoryGlobalEntryById(id: string): Promise<InventoryGlobalEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<InventoryGlobalRow[]>`
    select ${db.unsafe(INVENTORY_GLOBAL_SELECT)}
    from inventory_global_entries
    where id = ${Number(id)}
    limit 1;
  `;
  return rows[0] ? mapInventoryGlobal(rows[0]) : null;
}

export async function createInventoryGlobalEntry(
  input: Omit<InventoryGlobalEntry, "id" | "createdAt" | "updatedAt">,
): Promise<InventoryGlobalEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<InventoryGlobalRow[]>`
    insert into inventory_global_entries (
      main_sku, variant_sku, batch, batch_no_sn, good_to_release_shipment_from_cm, status, description,
      stock_qty_available_for_fulfillment, reserved_qty, batches_balance_qty, mp_batch_produced_qty, dkks_factory,
      huili_factory, bolan_factory, jiadun_factory, jinjian_factory, huamei_factory, shenzhen_office, taiwan_fuhshing,
      singapore_office, cargohub_warehouse, korea_solity_factory, vietnam_solity_factory, aztech_factory, swr_factory,
      vs_factory, ibe_factory, smart_warehousing, omni_warehouse, amazon_fba, safety_stock_at_amazon, jdm_warehouse,
      amazon, syw, in_transit_stock, inventory_received_date, aging_days_c, unit_price_rmb, unit_price_usd,
      batches_inventory_cost_usd, sku_inventory_cost_usd, china_inventory_cost_usd, singapore_inventory_cost_usd,
      singapore_cargohub_inventory_cost_usd, korea_solity_inventory_cost, vietnam_solity_inventory_cost_usd,
      usa_omni_inventory_vost_usd, us_amazon_fba, europe_jdm_inventory_cost_usd, in_transit_inventory_cost_usd,
      created_by
    ) values (
      ${input.mainSku.trim()}, ${input.variantSku.trim()}, ${input.batch.trim()}, ${input.batchNoSn.trim()},
      ${Math.max(0, Math.trunc(input.goodToReleaseShipmentFromCm))}, ${input.status.trim()}, ${input.description.trim()},
      ${Math.max(0, Math.trunc(input.stockQtyAvailableForFulfillment))}, ${Math.max(0, Math.trunc(input.reservedQty))},
      ${Math.max(0, Math.trunc(input.batchesBalanceQty))}, ${Math.max(0, Math.trunc(input.mpBatchProducedQty))},
      ${Math.max(0, Math.trunc(input.dkksFactory))}, ${Math.max(0, Math.trunc(input.huiliFactory))},
      ${Math.max(0, Math.trunc(input.bolanFactory))}, ${Math.max(0, Math.trunc(input.jiadunFactory))},
      ${Math.max(0, Math.trunc(input.jinjianFactory))}, ${Math.max(0, Math.trunc(input.huameiFactory))},
      ${Math.max(0, Math.trunc(input.shenzhenOffice))}, ${Math.max(0, Math.trunc(input.taiwanFuhshing))},
      ${Math.max(0, Math.trunc(input.singaporeOffice))}, ${Math.max(0, Math.trunc(input.cargohubWarehouse))},
      ${Math.max(0, Math.trunc(input.koreaSolityFactory))}, ${Math.max(0, Math.trunc(input.vietnamSolityFactory))},
      ${Math.max(0, Math.trunc(input.aztechFactory))}, ${Math.max(0, Math.trunc(input.swrFactory))},
      ${Math.max(0, Math.trunc(input.vsFactory))}, ${Math.max(0, Math.trunc(input.ibeFactory))},
      ${Math.max(0, Math.trunc(input.smartWarehousing))}, ${Math.max(0, Math.trunc(input.omniWarehouse))},
      ${Math.max(0, Math.trunc(input.amazonFba))}, ${Math.max(0, Math.trunc(input.safetyStockAtAmazon))},
      ${Math.max(0, Math.trunc(input.jdmWarehouse))}, ${Math.max(0, Math.trunc(input.amazon))},
      ${Math.max(0, Math.trunc(input.syw))}, ${Math.max(0, Math.trunc(input.inTransitStock))},
      ${input.inventoryReceivedDate}, ${Math.max(0, Math.trunc(input.agingDaysC))}, ${Math.max(0, input.unitPriceRmb)},
      ${Math.max(0, input.unitPriceUsd)}, ${Math.max(0, input.batchesInventoryCostUsd)},
      ${Math.max(0, input.skuInventoryCostUsd)}, ${Math.max(0, input.chinaInventoryCostUsd)},
      ${Math.max(0, input.singaporeInventoryCostUsd)}, ${Math.max(0, input.singaporeCargohubInventoryCostUsd)},
      ${Math.max(0, input.koreaSolityInventoryCost)}, ${Math.max(0, input.vietnamSolityInventoryCostUsd)},
      ${Math.max(0, input.usaOmniInventoryVostUsd)}, ${Math.max(0, input.usAmazonFba)},
      ${Math.max(0, input.europeJdmInventoryCostUsd)}, ${Math.max(0, input.inTransitInventoryCostUsd)},
      ${input.createdBy}
    )
    returning ${db.unsafe(INVENTORY_GLOBAL_SELECT)};
  `;
  return mapInventoryGlobal(rows[0]);
}

export async function updateInventoryGlobalEntry(
  input: Omit<InventoryGlobalEntry, "createdAt" | "updatedAt">,
): Promise<InventoryGlobalEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<InventoryGlobalRow[]>`
    update inventory_global_entries
    set
      main_sku = ${input.mainSku.trim()},
      variant_sku = ${input.variantSku.trim()},
      batch = ${input.batch.trim()},
      batch_no_sn = ${input.batchNoSn.trim()},
      good_to_release_shipment_from_cm = ${Math.max(0, Math.trunc(input.goodToReleaseShipmentFromCm))},
      status = ${input.status.trim()},
      description = ${input.description.trim()},
      stock_qty_available_for_fulfillment = ${Math.max(0, Math.trunc(input.stockQtyAvailableForFulfillment))},
      reserved_qty = ${Math.max(0, Math.trunc(input.reservedQty))},
      batches_balance_qty = ${Math.max(0, Math.trunc(input.batchesBalanceQty))},
      mp_batch_produced_qty = ${Math.max(0, Math.trunc(input.mpBatchProducedQty))},
      dkks_factory = ${Math.max(0, Math.trunc(input.dkksFactory))},
      huili_factory = ${Math.max(0, Math.trunc(input.huiliFactory))},
      bolan_factory = ${Math.max(0, Math.trunc(input.bolanFactory))},
      jiadun_factory = ${Math.max(0, Math.trunc(input.jiadunFactory))},
      jinjian_factory = ${Math.max(0, Math.trunc(input.jinjianFactory))},
      huamei_factory = ${Math.max(0, Math.trunc(input.huameiFactory))},
      shenzhen_office = ${Math.max(0, Math.trunc(input.shenzhenOffice))},
      taiwan_fuhshing = ${Math.max(0, Math.trunc(input.taiwanFuhshing))},
      singapore_office = ${Math.max(0, Math.trunc(input.singaporeOffice))},
      cargohub_warehouse = ${Math.max(0, Math.trunc(input.cargohubWarehouse))},
      korea_solity_factory = ${Math.max(0, Math.trunc(input.koreaSolityFactory))},
      vietnam_solity_factory = ${Math.max(0, Math.trunc(input.vietnamSolityFactory))},
      aztech_factory = ${Math.max(0, Math.trunc(input.aztechFactory))},
      swr_factory = ${Math.max(0, Math.trunc(input.swrFactory))},
      vs_factory = ${Math.max(0, Math.trunc(input.vsFactory))},
      ibe_factory = ${Math.max(0, Math.trunc(input.ibeFactory))},
      smart_warehousing = ${Math.max(0, Math.trunc(input.smartWarehousing))},
      omni_warehouse = ${Math.max(0, Math.trunc(input.omniWarehouse))},
      amazon_fba = ${Math.max(0, Math.trunc(input.amazonFba))},
      safety_stock_at_amazon = ${Math.max(0, Math.trunc(input.safetyStockAtAmazon))},
      jdm_warehouse = ${Math.max(0, Math.trunc(input.jdmWarehouse))},
      amazon = ${Math.max(0, Math.trunc(input.amazon))},
      syw = ${Math.max(0, Math.trunc(input.syw))},
      in_transit_stock = ${Math.max(0, Math.trunc(input.inTransitStock))},
      inventory_received_date = ${input.inventoryReceivedDate},
      aging_days_c = ${Math.max(0, Math.trunc(input.agingDaysC))},
      unit_price_rmb = ${Math.max(0, input.unitPriceRmb)},
      unit_price_usd = ${Math.max(0, input.unitPriceUsd)},
      batches_inventory_cost_usd = ${Math.max(0, input.batchesInventoryCostUsd)},
      sku_inventory_cost_usd = ${Math.max(0, input.skuInventoryCostUsd)},
      china_inventory_cost_usd = ${Math.max(0, input.chinaInventoryCostUsd)},
      singapore_inventory_cost_usd = ${Math.max(0, input.singaporeInventoryCostUsd)},
      singapore_cargohub_inventory_cost_usd = ${Math.max(0, input.singaporeCargohubInventoryCostUsd)},
      korea_solity_inventory_cost = ${Math.max(0, input.koreaSolityInventoryCost)},
      vietnam_solity_inventory_cost_usd = ${Math.max(0, input.vietnamSolityInventoryCostUsd)},
      usa_omni_inventory_vost_usd = ${Math.max(0, input.usaOmniInventoryVostUsd)},
      us_amazon_fba = ${Math.max(0, input.usAmazonFba)},
      europe_jdm_inventory_cost_usd = ${Math.max(0, input.europeJdmInventoryCostUsd)},
      in_transit_inventory_cost_usd = ${Math.max(0, input.inTransitInventoryCostUsd)},
      updated_at = now()
    where id = ${Number(input.id)}
    returning ${db.unsafe(INVENTORY_GLOBAL_SELECT)};
  `;
  return rows[0] ? mapInventoryGlobal(rows[0]) : null;
}

export async function deleteInventoryGlobalEntryById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from inventory_global_entries where id = ${Number(id)};`;
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
    email: row.email || "",
    paymentTerms: row.payment_terms || "",
    leadTimeDays: Number(row.lead_time_days ?? 0),
    moq: Number(row.moq ?? 0),
    incoterm: row.incoterm || "",
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBomEntry(row: BomRow): BomEntry {
  return {
    id: String(row.id),
    projectName: row.project_name || "",
    sku: row.sku,
    bomVersion: row.bom_version || "",
    status: row.status,
    effectiveDate: row.effective_date ? formatPgDateOnly(row.effective_date) : null,
    componentCode: row.component_code || "",
    componentName: row.component_name || "",
    specification: row.specification || "",
    quantityPer: Number(row.quantity_per ?? 0),
    uom: row.uom || "PCS",
    supplierName: row.supplier_name || "",
    unitCost: Number(row.unit_cost ?? 0),
    moq: Number(row.moq ?? 0),
    leadTimeDays: Number(row.lead_time_days ?? 0),
    isCritical: Boolean(row.is_critical),
    remarks: row.remarks || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapToolingEntry(row: ToolingRow): ToolingEntry {
  return {
    id: String(row.id),
    toolingCode: row.tooling_code || "",
    toolingName: row.tooling_name || "",
    toolingType: row.tooling_type,
    relatedSku: row.related_sku || "",
    cmName: row.cm_name || "",
    location: row.location || "",
    status: row.status,
    owner: row.owner || "",
    manufacturer: row.manufacturer || "",
    startUseDate: row.start_use_date ? formatPgDateOnly(row.start_use_date) : null,
    cycleCount: Number(row.cycle_count ?? 0),
    cycleLimit: Number(row.cycle_limit ?? 0),
    lastMaintenanceDate: row.last_maintenance_date ? formatPgDateOnly(row.last_maintenance_date) : null,
    nextMaintenanceDue: row.next_maintenance_due ? formatPgDateOnly(row.next_maintenance_due) : null,
    cost: Number(row.cost ?? 0),
    currency: row.currency || "USD",
    remarks: row.remarks || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEcnEntry(row: EcnRow): EcnEntry {
  return {
    id: String(row.id),
    ecnNo: row.ecn_no || "",
    title: row.title || "",
    status: row.status,
    priority: row.priority,
    requester: row.requester || "",
    owner: row.owner || "",
    targetEffectiveDate: row.target_effective_date ? formatPgDateOnly(row.target_effective_date) : null,
    actualEffectiveDate: row.actual_effective_date ? formatPgDateOnly(row.actual_effective_date) : null,
    affectedSkus: row.affected_skus || "",
    impactSummary: row.impact_summary || "",
    reason: row.reason || "",
    remarks: row.remarks || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSopEntry(row: SopRow): SopEntry {
  return {
    id: String(row.id),
    sopNo: row.sop_no || "",
    title: row.title || "",
    productLine: row.product_line || "",
    sku: row.sku || "",
    processStep: row.process_step || "",
    workstation: row.workstation || "",
    owner: row.owner || "",
    reviewer: row.reviewer || "",
    approver: row.approver || "",
    status: row.status,
    version: row.version || "V1.0",
    effectiveDate: row.effective_date ? formatPgDateOnly(row.effective_date) : null,
    trainingRequired: Boolean(row.training_required),
    safetyNotes: row.safety_notes || "",
    keyCtq: row.key_ctq || "",
    controlMethod: row.control_method || "",
    attachmentUrl: row.attachment_url || "",
    remarks: row.remarks || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQcTestCaseEntry(row: QcTestCaseRow): QcTestCaseEntry {
  return {
    id: String(row.id),
    testCaseId: row.test_case_id || "",
    title: row.title || "",
    productSku: row.product_sku || "",
    firmwareVersion: row.firmware_version || "",
    moduleName: row.module_name || "",
    category: row.category,
    priority: row.priority,
    status: row.status,
    preconditions: row.preconditions || "",
    steps: row.steps || "",
    expectedResult: row.expected_result || "",
    environment: row.environment || "",
    owner: row.owner || "",
    remarks: row.remarks || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQcCertificationEntry(row: QcCertificationRow): QcCertificationEntry {
  return {
    id: String(row.id),
    certificateNo: row.certificate_no || "",
    productSku: row.product_sku || "",
    productName: row.product_name || "",
    region: row.region || "",
    standardName: row.standard_name || "",
    certBody: row.cert_body || "",
    status: row.status,
    applicationDate: row.application_date ? formatPgDateOnly(row.application_date) : null,
    issueDate: row.issue_date ? formatPgDateOnly(row.issue_date) : null,
    expiryDate: row.expiry_date ? formatPgDateOnly(row.expiry_date) : null,
    reportUrl: row.report_url || "",
    owner: row.owner || "",
    notes: row.notes || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQcOrtReportEntry(row: QcOrtReportRow): QcOrtReportEntry {
  return {
    id: String(row.id),
    ortNo: row.ort_no || "",
    productSku: row.product_sku || "",
    batchNo: row.batch_no || "",
    factory: row.factory || "",
    sampleSize: Number(row.sample_size ?? 0),
    testItems: row.test_items || "",
    environmentProfile: row.environment_profile || "",
    duration: row.duration || "",
    resultSummary: row.result_summary,
    failCount: Number(row.fail_count ?? 0),
    failModes: row.fail_modes || "",
    actionTaken: row.action_taken || "",
    owner: row.owner || "",
    startDate: row.start_date ? formatPgDateOnly(row.start_date) : null,
    endDate: row.end_date ? formatPgDateOnly(row.end_date) : null,
    reportUrl: row.report_url || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQc8dReportEntry(row: Qc8dReportRow): Qc8dReportEntry {
  return {
    id: String(row.id),
    reportNo: row.report_no || "",
    issueTitle: row.issue_title || "",
    productSku: row.product_sku || "",
    customer: row.customer || "",
    region: row.region || "",
    severity: row.severity,
    status: row.status,
    owner: row.owner || "",
    d3Containment: row.d3_containment || "",
    d4RootCause: row.d4_root_cause || "",
    d5CorrectiveAction: row.d5_corrective_action || "",
    d6ImplementationPlan: row.d6_implementation_plan || "",
    dateOpened: row.date_opened ? formatPgDateOnly(row.date_opened) : null,
    dateClosed: row.date_closed ? formatPgDateOnly(row.date_closed) : null,
    affectedQuantity: Number(row.affected_quantity ?? 0),
    costImpact: Number(row.cost_impact ?? 0),
    remarks: row.remarks || "",
    createdBy: row.created_by,
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

export async function listBomEntries(): Promise<BomEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<BomRow[]>`
    select
      id,
      project_name,
      sku,
      bom_version,
      status,
      effective_date::text,
      component_code,
      component_name,
      specification,
      quantity_per::text,
      uom,
      supplier_name,
      unit_cost::text,
      moq,
      lead_time_days,
      is_critical,
      remarks,
      created_by,
      created_at::text,
      updated_at::text
    from npi_bom_entries
    order by updated_at desc, id desc;
  `;
  return rows.map(mapBomEntry);
}

export async function createBomEntry(input: {
  projectName: string;
  sku: string;
  bomVersion: string;
  status: BomStatus;
  effectiveDate: string | null;
  componentCode: string;
  componentName: string;
  specification: string;
  quantityPer: number;
  uom: string;
  supplierName: string;
  unitCost: number;
  moq: number;
  leadTimeDays: number;
  isCritical: boolean;
  remarks: string;
  createdBy: string;
}): Promise<BomEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<BomRow[]>`
    insert into npi_bom_entries (
      project_name, sku, bom_version, status, effective_date,
      component_code, component_name, specification, quantity_per, uom,
      supplier_name, unit_cost, moq, lead_time_days, is_critical, remarks, created_by, updated_at
    ) values (
      ${input.projectName.trim()},
      ${input.sku.trim()},
      ${input.bomVersion.trim()},
      ${input.status},
      ${input.effectiveDate},
      ${input.componentCode.trim()},
      ${input.componentName.trim()},
      ${input.specification.trim()},
      ${Math.max(0, input.quantityPer)},
      ${input.uom.trim() || "PCS"},
      ${input.supplierName.trim()},
      ${Math.max(0, input.unitCost)},
      ${Math.max(0, Math.trunc(input.moq))},
      ${Math.max(0, Math.trunc(input.leadTimeDays))},
      ${input.isCritical},
      ${input.remarks.trim()},
      ${input.createdBy},
      now()
    )
    returning
      id, project_name, sku, bom_version, status, effective_date::text, component_code, component_name, specification,
      quantity_per::text, uom, supplier_name, unit_cost::text, moq, lead_time_days, is_critical, remarks,
      created_by, created_at::text, updated_at::text;
  `;
  return mapBomEntry(rows[0]);
}

export async function updateBomEntry(input: {
  id: string;
  projectName: string;
  sku: string;
  bomVersion: string;
  status: BomStatus;
  effectiveDate: string | null;
  componentCode: string;
  componentName: string;
  specification: string;
  quantityPer: number;
  uom: string;
  supplierName: string;
  unitCost: number;
  moq: number;
  leadTimeDays: number;
  isCritical: boolean;
  remarks: string;
}): Promise<BomEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<BomRow[]>`
    update npi_bom_entries
    set
      project_name = ${input.projectName.trim()},
      sku = ${input.sku.trim()},
      bom_version = ${input.bomVersion.trim()},
      status = ${input.status},
      effective_date = ${input.effectiveDate},
      component_code = ${input.componentCode.trim()},
      component_name = ${input.componentName.trim()},
      specification = ${input.specification.trim()},
      quantity_per = ${Math.max(0, input.quantityPer)},
      uom = ${input.uom.trim() || "PCS"},
      supplier_name = ${input.supplierName.trim()},
      unit_cost = ${Math.max(0, input.unitCost)},
      moq = ${Math.max(0, Math.trunc(input.moq))},
      lead_time_days = ${Math.max(0, Math.trunc(input.leadTimeDays))},
      is_critical = ${input.isCritical},
      remarks = ${input.remarks.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id, project_name, sku, bom_version, status, effective_date::text, component_code, component_name, specification,
      quantity_per::text, uom, supplier_name, unit_cost::text, moq, lead_time_days, is_critical, remarks,
      created_by, created_at::text, updated_at::text;
  `;
  return rows[0] ? mapBomEntry(rows[0]) : null;
}

export async function deleteBomEntryById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from npi_bom_entries where id = ${Number(id)};`;
}

export async function listToolingEntries(): Promise<ToolingEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ToolingRow[]>`
    select
      id, tooling_code, tooling_name, tooling_type, related_sku, cm_name, location, status, owner, manufacturer,
      start_use_date::text, cycle_count, cycle_limit, last_maintenance_date::text, next_maintenance_due::text,
      cost::text, currency, remarks, created_by, created_at::text, updated_at::text
    from npi_tooling_entries
    order by updated_at desc, id desc;
  `;
  return rows.map(mapToolingEntry);
}

export async function createToolingEntry(input: {
  toolingCode: string;
  toolingName: string;
  toolingType: ToolingType;
  relatedSku: string;
  cmName: string;
  location: string;
  status: ToolingStatus;
  owner: string;
  manufacturer: string;
  startUseDate: string | null;
  cycleCount: number;
  cycleLimit: number;
  lastMaintenanceDate: string | null;
  nextMaintenanceDue: string | null;
  cost: number;
  currency: string;
  remarks: string;
  createdBy: string;
}): Promise<ToolingEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ToolingRow[]>`
    insert into npi_tooling_entries (
      tooling_code, tooling_name, tooling_type, related_sku, cm_name, location, status, owner, manufacturer,
      start_use_date, cycle_count, cycle_limit, last_maintenance_date, next_maintenance_due,
      cost, currency, remarks, created_by, updated_at
    ) values (
      ${input.toolingCode.trim()}, ${input.toolingName.trim()}, ${input.toolingType}, ${input.relatedSku.trim()},
      ${input.cmName.trim()}, ${input.location.trim()}, ${input.status}, ${input.owner.trim()}, ${input.manufacturer.trim()},
      ${input.startUseDate}, ${Math.max(0, Math.trunc(input.cycleCount))}, ${Math.max(0, Math.trunc(input.cycleLimit))},
      ${input.lastMaintenanceDate}, ${input.nextMaintenanceDue},
      ${Math.max(0, input.cost)}, ${input.currency.trim() || "USD"}, ${input.remarks.trim()},
      ${input.createdBy}, now()
    )
    returning
      id, tooling_code, tooling_name, tooling_type, related_sku, cm_name, location, status, owner, manufacturer,
      start_use_date::text, cycle_count, cycle_limit, last_maintenance_date::text, next_maintenance_due::text,
      cost::text, currency, remarks, created_by, created_at::text, updated_at::text;
  `;
  return mapToolingEntry(rows[0]);
}

export async function updateToolingEntry(input: {
  id: string;
  toolingCode: string;
  toolingName: string;
  toolingType: ToolingType;
  relatedSku: string;
  cmName: string;
  location: string;
  status: ToolingStatus;
  owner: string;
  manufacturer: string;
  startUseDate: string | null;
  cycleCount: number;
  cycleLimit: number;
  lastMaintenanceDate: string | null;
  nextMaintenanceDue: string | null;
  cost: number;
  currency: string;
  remarks: string;
}): Promise<ToolingEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<ToolingRow[]>`
    update npi_tooling_entries
    set
      tooling_code = ${input.toolingCode.trim()},
      tooling_name = ${input.toolingName.trim()},
      tooling_type = ${input.toolingType},
      related_sku = ${input.relatedSku.trim()},
      cm_name = ${input.cmName.trim()},
      location = ${input.location.trim()},
      status = ${input.status},
      owner = ${input.owner.trim()},
      manufacturer = ${input.manufacturer.trim()},
      start_use_date = ${input.startUseDate},
      cycle_count = ${Math.max(0, Math.trunc(input.cycleCount))},
      cycle_limit = ${Math.max(0, Math.trunc(input.cycleLimit))},
      last_maintenance_date = ${input.lastMaintenanceDate},
      next_maintenance_due = ${input.nextMaintenanceDue},
      cost = ${Math.max(0, input.cost)},
      currency = ${input.currency.trim() || "USD"},
      remarks = ${input.remarks.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id, tooling_code, tooling_name, tooling_type, related_sku, cm_name, location, status, owner, manufacturer,
      start_use_date::text, cycle_count, cycle_limit, last_maintenance_date::text, next_maintenance_due::text,
      cost::text, currency, remarks, created_by, created_at::text, updated_at::text;
  `;
  return rows[0] ? mapToolingEntry(rows[0]) : null;
}

export async function deleteToolingEntryById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from npi_tooling_entries where id = ${Number(id)};`;
}

export async function listEcnEntries(): Promise<EcnEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<EcnRow[]>`
    select
      id, ecn_no, title, status, priority, requester, owner, target_effective_date::text, actual_effective_date::text,
      affected_skus, impact_summary, reason, remarks, created_by, created_at::text, updated_at::text
    from npi_ecn_entries
    order by updated_at desc, id desc;
  `;
  return rows.map(mapEcnEntry);
}

export async function createEcnEntry(input: {
  ecnNo: string;
  title: string;
  status: EcnStatus;
  priority: EcnPriority;
  requester: string;
  owner: string;
  targetEffectiveDate: string | null;
  actualEffectiveDate: string | null;
  affectedSkus: string;
  impactSummary: string;
  reason: string;
  remarks: string;
  createdBy: string;
}): Promise<EcnEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<EcnRow[]>`
    insert into npi_ecn_entries (
      ecn_no, title, status, priority, requester, owner, target_effective_date, actual_effective_date,
      affected_skus, impact_summary, reason, remarks, created_by, updated_at
    ) values (
      ${input.ecnNo.trim()}, ${input.title.trim()}, ${input.status}, ${input.priority}, ${input.requester.trim()}, ${input.owner.trim()},
      ${input.targetEffectiveDate}, ${input.actualEffectiveDate}, ${input.affectedSkus.trim()}, ${input.impactSummary.trim()},
      ${input.reason.trim()}, ${input.remarks.trim()}, ${input.createdBy}, now()
    )
    returning
      id, ecn_no, title, status, priority, requester, owner, target_effective_date::text, actual_effective_date::text,
      affected_skus, impact_summary, reason, remarks, created_by, created_at::text, updated_at::text;
  `;
  return mapEcnEntry(rows[0]);
}

export async function updateEcnEntry(input: {
  id: string;
  ecnNo: string;
  title: string;
  status: EcnStatus;
  priority: EcnPriority;
  requester: string;
  owner: string;
  targetEffectiveDate: string | null;
  actualEffectiveDate: string | null;
  affectedSkus: string;
  impactSummary: string;
  reason: string;
  remarks: string;
}): Promise<EcnEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<EcnRow[]>`
    update npi_ecn_entries
    set
      ecn_no = ${input.ecnNo.trim()},
      title = ${input.title.trim()},
      status = ${input.status},
      priority = ${input.priority},
      requester = ${input.requester.trim()},
      owner = ${input.owner.trim()},
      target_effective_date = ${input.targetEffectiveDate},
      actual_effective_date = ${input.actualEffectiveDate},
      affected_skus = ${input.affectedSkus.trim()},
      impact_summary = ${input.impactSummary.trim()},
      reason = ${input.reason.trim()},
      remarks = ${input.remarks.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id, ecn_no, title, status, priority, requester, owner, target_effective_date::text, actual_effective_date::text,
      affected_skus, impact_summary, reason, remarks, created_by, created_at::text, updated_at::text;
  `;
  return rows[0] ? mapEcnEntry(rows[0]) : null;
}

export async function deleteEcnEntryById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from npi_ecn_entries where id = ${Number(id)};`;
}

export async function listSopEntries(): Promise<SopEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<SopRow[]>`
    select
      id, sop_no, title, product_line, sku, process_step, workstation, owner, reviewer, approver,
      status, version, effective_date::text, training_required, safety_notes, key_ctq, control_method,
      attachment_url, remarks, created_by, created_at::text, updated_at::text
    from npi_sop_entries
    order by updated_at desc, id desc;
  `;
  return rows.map(mapSopEntry);
}

export async function createSopEntry(input: {
  sopNo: string;
  title: string;
  productLine: string;
  sku: string;
  processStep: string;
  workstation: string;
  owner: string;
  reviewer: string;
  approver: string;
  status: SopStatus;
  version: string;
  effectiveDate: string | null;
  trainingRequired: boolean;
  safetyNotes: string;
  keyCtq: string;
  controlMethod: string;
  attachmentUrl: string;
  remarks: string;
  createdBy: string;
}): Promise<SopEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<SopRow[]>`
    insert into npi_sop_entries (
      sop_no, title, product_line, sku, process_step, workstation, owner, reviewer, approver, status,
      version, effective_date, training_required, safety_notes, key_ctq, control_method, attachment_url,
      remarks, created_by, updated_at
    ) values (
      ${input.sopNo.trim()}, ${input.title.trim()}, ${input.productLine.trim()}, ${input.sku.trim()},
      ${input.processStep.trim()}, ${input.workstation.trim()}, ${input.owner.trim()}, ${input.reviewer.trim()},
      ${input.approver.trim()}, ${input.status}, ${input.version.trim() || "V1.0"}, ${input.effectiveDate},
      ${input.trainingRequired}, ${input.safetyNotes.trim()}, ${input.keyCtq.trim()},
      ${input.controlMethod.trim()}, ${input.attachmentUrl.trim()}, ${input.remarks.trim()},
      ${input.createdBy}, now()
    )
    returning
      id, sop_no, title, product_line, sku, process_step, workstation, owner, reviewer, approver,
      status, version, effective_date::text, training_required, safety_notes, key_ctq, control_method,
      attachment_url, remarks, created_by, created_at::text, updated_at::text;
  `;
  return mapSopEntry(rows[0]);
}

export async function updateSopEntry(input: {
  id: string;
  sopNo: string;
  title: string;
  productLine: string;
  sku: string;
  processStep: string;
  workstation: string;
  owner: string;
  reviewer: string;
  approver: string;
  status: SopStatus;
  version: string;
  effectiveDate: string | null;
  trainingRequired: boolean;
  safetyNotes: string;
  keyCtq: string;
  controlMethod: string;
  attachmentUrl: string;
  remarks: string;
}): Promise<SopEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<SopRow[]>`
    update npi_sop_entries
    set
      sop_no = ${input.sopNo.trim()},
      title = ${input.title.trim()},
      product_line = ${input.productLine.trim()},
      sku = ${input.sku.trim()},
      process_step = ${input.processStep.trim()},
      workstation = ${input.workstation.trim()},
      owner = ${input.owner.trim()},
      reviewer = ${input.reviewer.trim()},
      approver = ${input.approver.trim()},
      status = ${input.status},
      version = ${input.version.trim() || "V1.0"},
      effective_date = ${input.effectiveDate},
      training_required = ${input.trainingRequired},
      safety_notes = ${input.safetyNotes.trim()},
      key_ctq = ${input.keyCtq.trim()},
      control_method = ${input.controlMethod.trim()},
      attachment_url = ${input.attachmentUrl.trim()},
      remarks = ${input.remarks.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id, sop_no, title, product_line, sku, process_step, workstation, owner, reviewer, approver,
      status, version, effective_date::text, training_required, safety_notes, key_ctq, control_method,
      attachment_url, remarks, created_by, created_at::text, updated_at::text;
  `;
  return rows[0] ? mapSopEntry(rows[0]) : null;
}

export async function deleteSopEntryById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from npi_sop_entries where id = ${Number(id)};`;
}

export async function listQcTestCaseEntries(): Promise<QcTestCaseEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<QcTestCaseRow[]>`
    select
      id, test_case_id, title, product_sku, firmware_version, module_name, category, priority, status,
      preconditions, steps, expected_result, environment, owner, remarks,
      created_by, created_at::text, updated_at::text
    from qc_test_cases
    order by updated_at desc, id desc;
  `;
  return rows.map(mapQcTestCaseEntry);
}

export async function createQcTestCaseEntry(input: Omit<QcTestCaseEntry, "id" | "createdAt" | "updatedAt">): Promise<QcTestCaseEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<QcTestCaseRow[]>`
    insert into qc_test_cases (
      test_case_id, title, product_sku, firmware_version, module_name, category, priority, status,
      preconditions, steps, expected_result, environment, owner, remarks, created_by, updated_at
    ) values (
      ${input.testCaseId.trim()}, ${input.title.trim()}, ${input.productSku.trim()}, ${input.firmwareVersion.trim()},
      ${input.moduleName.trim()}, ${input.category}, ${input.priority}, ${input.status},
      ${input.preconditions.trim()}, ${input.steps.trim()}, ${input.expectedResult.trim()}, ${input.environment.trim()},
      ${input.owner.trim()}, ${input.remarks.trim()}, ${input.createdBy}, now()
    )
    returning
      id, test_case_id, title, product_sku, firmware_version, module_name, category, priority, status,
      preconditions, steps, expected_result, environment, owner, remarks,
      created_by, created_at::text, updated_at::text;
  `;
  return mapQcTestCaseEntry(rows[0]);
}

export async function updateQcTestCaseEntry(input: Omit<QcTestCaseEntry, "createdAt" | "updatedAt">): Promise<QcTestCaseEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<QcTestCaseRow[]>`
    update qc_test_cases
    set
      test_case_id = ${input.testCaseId.trim()},
      title = ${input.title.trim()},
      product_sku = ${input.productSku.trim()},
      firmware_version = ${input.firmwareVersion.trim()},
      module_name = ${input.moduleName.trim()},
      category = ${input.category},
      priority = ${input.priority},
      status = ${input.status},
      preconditions = ${input.preconditions.trim()},
      steps = ${input.steps.trim()},
      expected_result = ${input.expectedResult.trim()},
      environment = ${input.environment.trim()},
      owner = ${input.owner.trim()},
      remarks = ${input.remarks.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id, test_case_id, title, product_sku, firmware_version, module_name, category, priority, status,
      preconditions, steps, expected_result, environment, owner, remarks,
      created_by, created_at::text, updated_at::text;
  `;
  return rows[0] ? mapQcTestCaseEntry(rows[0]) : null;
}

export async function deleteQcTestCaseEntryById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from qc_test_cases where id = ${Number(id)};`;
}

export async function listQcCertificationEntries(): Promise<QcCertificationEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<QcCertificationRow[]>`
    select
      id, certificate_no, product_sku, product_name, region, standard_name, cert_body, status,
      application_date::text, issue_date::text, expiry_date::text, report_url, owner, notes,
      created_by, created_at::text, updated_at::text
    from qc_certifications
    order by updated_at desc, id desc;
  `;
  return rows.map(mapQcCertificationEntry);
}

export async function createQcCertificationEntry(input: Omit<QcCertificationEntry, "id" | "createdAt" | "updatedAt">): Promise<QcCertificationEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<QcCertificationRow[]>`
    insert into qc_certifications (
      certificate_no, product_sku, product_name, region, standard_name, cert_body, status,
      application_date, issue_date, expiry_date, report_url, owner, notes, created_by, updated_at
    ) values (
      ${input.certificateNo.trim()}, ${input.productSku.trim()}, ${input.productName.trim()}, ${input.region.trim()},
      ${input.standardName.trim()}, ${input.certBody.trim()}, ${input.status},
      ${input.applicationDate}, ${input.issueDate}, ${input.expiryDate}, ${input.reportUrl.trim()},
      ${input.owner.trim()}, ${input.notes.trim()}, ${input.createdBy}, now()
    )
    returning
      id, certificate_no, product_sku, product_name, region, standard_name, cert_body, status,
      application_date::text, issue_date::text, expiry_date::text, report_url, owner, notes,
      created_by, created_at::text, updated_at::text;
  `;
  return mapQcCertificationEntry(rows[0]);
}

export async function updateQcCertificationEntry(input: Omit<QcCertificationEntry, "createdAt" | "updatedAt">): Promise<QcCertificationEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<QcCertificationRow[]>`
    update qc_certifications
    set
      certificate_no = ${input.certificateNo.trim()},
      product_sku = ${input.productSku.trim()},
      product_name = ${input.productName.trim()},
      region = ${input.region.trim()},
      standard_name = ${input.standardName.trim()},
      cert_body = ${input.certBody.trim()},
      status = ${input.status},
      application_date = ${input.applicationDate},
      issue_date = ${input.issueDate},
      expiry_date = ${input.expiryDate},
      report_url = ${input.reportUrl.trim()},
      owner = ${input.owner.trim()},
      notes = ${input.notes.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id, certificate_no, product_sku, product_name, region, standard_name, cert_body, status,
      application_date::text, issue_date::text, expiry_date::text, report_url, owner, notes,
      created_by, created_at::text, updated_at::text;
  `;
  return rows[0] ? mapQcCertificationEntry(rows[0]) : null;
}

export async function deleteQcCertificationEntryById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from qc_certifications where id = ${Number(id)};`;
}

export async function listQcOrtReportEntries(): Promise<QcOrtReportEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<QcOrtReportRow[]>`
    select
      id, ort_no, product_sku, batch_no, factory, sample_size, test_items, environment_profile, duration, result_summary,
      fail_count, fail_modes, action_taken, owner, start_date::text, end_date::text, report_url,
      created_by, created_at::text, updated_at::text
    from qc_ort_reports
    order by updated_at desc, id desc;
  `;
  return rows.map(mapQcOrtReportEntry);
}

export async function createQcOrtReportEntry(input: Omit<QcOrtReportEntry, "id" | "createdAt" | "updatedAt">): Promise<QcOrtReportEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<QcOrtReportRow[]>`
    insert into qc_ort_reports (
      ort_no, product_sku, batch_no, factory, sample_size, test_items, environment_profile, duration, result_summary,
      fail_count, fail_modes, action_taken, owner, start_date, end_date, report_url, created_by, updated_at
    ) values (
      ${input.ortNo.trim()}, ${input.productSku.trim()}, ${input.batchNo.trim()}, ${input.factory.trim()},
      ${Math.max(0, Math.trunc(input.sampleSize))}, ${input.testItems.trim()}, ${input.environmentProfile.trim()},
      ${input.duration.trim()}, ${input.resultSummary}, ${Math.max(0, Math.trunc(input.failCount))},
      ${input.failModes.trim()}, ${input.actionTaken.trim()}, ${input.owner.trim()}, ${input.startDate}, ${input.endDate},
      ${input.reportUrl.trim()}, ${input.createdBy}, now()
    )
    returning
      id, ort_no, product_sku, batch_no, factory, sample_size, test_items, environment_profile, duration, result_summary,
      fail_count, fail_modes, action_taken, owner, start_date::text, end_date::text, report_url,
      created_by, created_at::text, updated_at::text;
  `;
  return mapQcOrtReportEntry(rows[0]);
}

export async function updateQcOrtReportEntry(input: Omit<QcOrtReportEntry, "createdAt" | "updatedAt">): Promise<QcOrtReportEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<QcOrtReportRow[]>`
    update qc_ort_reports
    set
      ort_no = ${input.ortNo.trim()},
      product_sku = ${input.productSku.trim()},
      batch_no = ${input.batchNo.trim()},
      factory = ${input.factory.trim()},
      sample_size = ${Math.max(0, Math.trunc(input.sampleSize))},
      test_items = ${input.testItems.trim()},
      environment_profile = ${input.environmentProfile.trim()},
      duration = ${input.duration.trim()},
      result_summary = ${input.resultSummary},
      fail_count = ${Math.max(0, Math.trunc(input.failCount))},
      fail_modes = ${input.failModes.trim()},
      action_taken = ${input.actionTaken.trim()},
      owner = ${input.owner.trim()},
      start_date = ${input.startDate},
      end_date = ${input.endDate},
      report_url = ${input.reportUrl.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id, ort_no, product_sku, batch_no, factory, sample_size, test_items, environment_profile, duration, result_summary,
      fail_count, fail_modes, action_taken, owner, start_date::text, end_date::text, report_url,
      created_by, created_at::text, updated_at::text;
  `;
  return rows[0] ? mapQcOrtReportEntry(rows[0]) : null;
}

export async function deleteQcOrtReportEntryById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from qc_ort_reports where id = ${Number(id)};`;
}

export async function listQc8dReportEntries(): Promise<Qc8dReportEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<Qc8dReportRow[]>`
    select
      id, report_no, issue_title, product_sku, customer, region, severity, status, owner,
      d3_containment, d4_root_cause, d5_corrective_action, d6_implementation_plan, date_opened::text, date_closed::text,
      affected_quantity, cost_impact::text, remarks, created_by, created_at::text, updated_at::text
    from qc_8d_reports
    order by updated_at desc, id desc;
  `;
  return rows.map(mapQc8dReportEntry);
}

export async function createQc8dReportEntry(input: Omit<Qc8dReportEntry, "id" | "createdAt" | "updatedAt">): Promise<Qc8dReportEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<Qc8dReportRow[]>`
    insert into qc_8d_reports (
      report_no, issue_title, product_sku, customer, region, severity, status, owner,
      d3_containment, d4_root_cause, d5_corrective_action, d6_implementation_plan,
      date_opened, date_closed, affected_quantity, cost_impact, remarks, created_by, updated_at
    ) values (
      ${input.reportNo.trim()}, ${input.issueTitle.trim()}, ${input.productSku.trim()}, ${input.customer.trim()}, ${input.region.trim()},
      ${input.severity}, ${input.status}, ${input.owner.trim()}, ${input.d3Containment.trim()}, ${input.d4RootCause.trim()},
      ${input.d5CorrectiveAction.trim()}, ${input.d6ImplementationPlan.trim()}, ${input.dateOpened}, ${input.dateClosed},
      ${Math.max(0, Math.trunc(input.affectedQuantity))}, ${Math.max(0, input.costImpact)}, ${input.remarks.trim()},
      ${input.createdBy}, now()
    )
    returning
      id, report_no, issue_title, product_sku, customer, region, severity, status, owner,
      d3_containment, d4_root_cause, d5_corrective_action, d6_implementation_plan, date_opened::text, date_closed::text,
      affected_quantity, cost_impact::text, remarks, created_by, created_at::text, updated_at::text;
  `;
  return mapQc8dReportEntry(rows[0]);
}

export async function updateQc8dReportEntry(input: Omit<Qc8dReportEntry, "createdAt" | "updatedAt">): Promise<Qc8dReportEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<Qc8dReportRow[]>`
    update qc_8d_reports
    set
      report_no = ${input.reportNo.trim()},
      issue_title = ${input.issueTitle.trim()},
      product_sku = ${input.productSku.trim()},
      customer = ${input.customer.trim()},
      region = ${input.region.trim()},
      severity = ${input.severity},
      status = ${input.status},
      owner = ${input.owner.trim()},
      d3_containment = ${input.d3Containment.trim()},
      d4_root_cause = ${input.d4RootCause.trim()},
      d5_corrective_action = ${input.d5CorrectiveAction.trim()},
      d6_implementation_plan = ${input.d6ImplementationPlan.trim()},
      date_opened = ${input.dateOpened},
      date_closed = ${input.dateClosed},
      affected_quantity = ${Math.max(0, Math.trunc(input.affectedQuantity))},
      cost_impact = ${Math.max(0, input.costImpact)},
      remarks = ${input.remarks.trim()},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id, report_no, issue_title, product_sku, customer, region, severity, status, owner,
      d3_containment, d4_root_cause, d5_corrective_action, d6_implementation_plan, date_opened::text, date_closed::text,
      affected_quantity, cost_impact::text, remarks, created_by, created_at::text, updated_at::text;
  `;
  return rows[0] ? mapQc8dReportEntry(rows[0]) : null;
}

export async function deleteQc8dReportEntryById(id: string): Promise<void> {
  await ensureDatabase();
  const db = getSql();
  await db`delete from qc_8d_reports where id = ${Number(id)};`;
}

export async function listSuppliers(): Promise<SupplierEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<SupplierRow[]>`
    select
      id,
      name,
      address,
      contact_name,
      contact_phone,
      email,
      payment_terms,
      lead_time_days,
      moq,
      incoterm,
      is_active,
      created_at::text,
      updated_at::text
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
  email: string;
  paymentTerms: string;
  leadTimeDays: number;
  moq: number;
  incoterm: string;
  isActive: boolean;
}): Promise<SupplierEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<SupplierRow[]>`
    insert into suppliers (
      name,
      address,
      contact_name,
      contact_phone,
      email,
      payment_terms,
      lead_time_days,
      moq,
      incoterm,
      is_active,
      updated_at
    )
    values (
      ${input.name.trim()},
      ${input.address.trim()},
      ${input.contactName.trim()},
      ${input.contactPhone.trim()},
      ${input.email.trim()},
      ${input.paymentTerms.trim()},
      ${Math.max(0, Math.trunc(input.leadTimeDays))},
      ${Math.max(0, Math.trunc(input.moq))},
      ${input.incoterm.trim()},
      ${input.isActive},
      now()
    )
    returning
      id, name, address, contact_name, contact_phone, email, payment_terms, lead_time_days, moq, incoterm, is_active,
      created_at::text, updated_at::text;
  `;
  return mapSupplier(rows[0]);
}

export async function updateSupplier(input: {
  id: string;
  name: string;
  address: string;
  contactName: string;
  contactPhone: string;
  email: string;
  paymentTerms: string;
  leadTimeDays: number;
  moq: number;
  incoterm: string;
  isActive: boolean;
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
      email = ${input.email.trim()},
      payment_terms = ${input.paymentTerms.trim()},
      lead_time_days = ${Math.max(0, Math.trunc(input.leadTimeDays))},
      moq = ${Math.max(0, Math.trunc(input.moq))},
      incoterm = ${input.incoterm.trim()},
      is_active = ${input.isActive},
      updated_at = now()
    where id = ${Number(input.id)}
    returning
      id, name, address, contact_name, contact_phone, email, payment_terms, lead_time_days, moq, incoterm, is_active,
      created_at::text, updated_at::text;
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
  const duplicates = await db<{ id: number; po_number: string; sku: string }[]>`
    select c.id, c.po_number, c.sku
    from contracts c
    join order_progress op on op.po_number = c.po_number and op.sku = c.sku
    where op.id = ${Number(input.orderProgressId)}
    limit 1;
  `;
  if (duplicates[0]) {
    throw new Error(
      `Contract already exists for PO ${duplicates[0].po_number} / SKU ${duplicates[0].sku}. Please edit the existing contract.`,
    );
  }
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

type CashFlowRow = {
  id: number;
  sku: string;
  order_date: string;
  quantity: number;
  order_number: string;
  unit_price: string | number;
  total_amount: string | number;
  advance_ratio_pct: string | number;
  payment_term_days: number;
  final_ratio_pct: string | number;
  actual_advance_date: string | null;
  actual_advance_amount: string | number | null;
  actual_final_date: string | null;
  actual_final_amount: string | number | null;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapCashFlow(row: CashFlowRow): CashFlowEntry {
  return {
    id: String(row.id),
    sku: row.sku,
    orderDate: formatPgDateOnly(row.order_date),
    quantity: Number(row.quantity ?? 0),
    orderNumber: row.order_number,
    unitPrice: Number(row.unit_price ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    advanceRatioPct: Number(row.advance_ratio_pct ?? 0),
    paymentTermDays: Number(row.payment_term_days ?? 0),
    finalRatioPct: Number(row.final_ratio_pct ?? 0),
    actualAdvanceDate: row.actual_advance_date ? formatPgDateOnly(row.actual_advance_date) : null,
    actualAdvanceAmount:
      row.actual_advance_amount != null && row.actual_advance_amount !== ""
        ? Number(row.actual_advance_amount)
        : null,
    actualFinalDate: row.actual_final_date ? formatPgDateOnly(row.actual_final_date) : null,
    actualFinalAmount:
      row.actual_final_amount != null && row.actual_final_amount !== ""
        ? Number(row.actual_final_amount)
        : null,
    remarks: row.remarks || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCashFlowEntries(): Promise<CashFlowEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<CashFlowRow[]>`
    select
      id,
      sku,
      order_date::text,
      quantity,
      order_number,
      unit_price::text,
      total_amount::text,
      advance_ratio_pct::text,
      payment_term_days,
      final_ratio_pct::text,
      actual_advance_date::text,
      actual_advance_amount::text,
      actual_final_date::text,
      actual_final_amount::text,
      remarks,
      created_by,
      created_at::text,
      updated_at::text
    from cash_flow_entries
    order by order_date desc, id desc
    limit 2000;
  `;
  return rows.map(mapCashFlow);
}

export async function createCashFlowEntry(input: {
  sku: string;
  orderDate: string;
  quantity: number;
  orderNumber: string;
  unitPrice: number;
  totalAmount: number;
  advanceRatioPct: number;
  paymentTermDays: number;
  finalRatioPct: number;
  actualAdvanceDate: string | null;
  actualAdvanceAmount: number | null;
  actualFinalDate: string | null;
  actualFinalAmount: number | null;
  remarks: string;
  createdBy: string;
}): Promise<CashFlowEntry> {
  await ensureDatabase();
  const db = getSql();
  const advDate = input.actualAdvanceDate?.trim() || null;
  const finDate = input.actualFinalDate?.trim() || null;
  const rows = await db<CashFlowRow[]>`
    insert into cash_flow_entries (
      sku,
      order_date,
      quantity,
      order_number,
      unit_price,
      total_amount,
      advance_ratio_pct,
      payment_term_days,
      final_ratio_pct,
      actual_advance_date,
      actual_advance_amount,
      actual_final_date,
      actual_final_amount,
      remarks,
      created_by
    )
    values (
      ${input.sku.trim()},
      ${input.orderDate.trim()},
      ${input.quantity},
      ${input.orderNumber.trim()},
      ${input.unitPrice},
      ${input.totalAmount},
      ${input.advanceRatioPct},
      ${input.paymentTermDays},
      ${input.finalRatioPct},
      ${advDate},
      ${input.actualAdvanceAmount},
      ${finDate},
      ${input.actualFinalAmount},
      ${input.remarks.trim()},
      ${input.createdBy}
    )
    returning
      id,
      sku,
      order_date::text,
      quantity,
      order_number,
      unit_price::text,
      total_amount::text,
      advance_ratio_pct::text,
      payment_term_days,
      final_ratio_pct::text,
      actual_advance_date::text,
      actual_advance_amount::text,
      actual_final_date::text,
      actual_final_amount::text,
      remarks,
      created_by,
      created_at::text,
      updated_at::text;
  `;
  if (!rows[0]) throw new Error("Create cash flow entry failed");
  return mapCashFlow(rows[0]);
}

export async function updateCashFlowEntryById(
  id: string,
  input: {
    sku: string;
    orderDate: string;
    quantity: number;
    orderNumber: string;
    unitPrice: number;
    totalAmount: number;
    advanceRatioPct: number;
    paymentTermDays: number;
    finalRatioPct: number;
    actualAdvanceDate: string | null;
    actualAdvanceAmount: number | null;
    actualFinalDate: string | null;
    actualFinalAmount: number | null;
    remarks: string;
  },
): Promise<CashFlowEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const advDate = input.actualAdvanceDate?.trim() || null;
  const finDate = input.actualFinalDate?.trim() || null;
  const rows = await db<CashFlowRow[]>`
    update cash_flow_entries
    set
      sku = ${input.sku.trim()},
      order_date = ${input.orderDate.trim()},
      quantity = ${input.quantity},
      order_number = ${input.orderNumber.trim()},
      unit_price = ${input.unitPrice},
      total_amount = ${input.totalAmount},
      advance_ratio_pct = ${input.advanceRatioPct},
      payment_term_days = ${input.paymentTermDays},
      final_ratio_pct = ${input.finalRatioPct},
      actual_advance_date = ${advDate},
      actual_advance_amount = ${input.actualAdvanceAmount},
      actual_final_date = ${finDate},
      actual_final_amount = ${input.actualFinalAmount},
      remarks = ${input.remarks.trim()},
      updated_at = now()
    where id = ${Number(id)}
    returning
      id,
      sku,
      order_date::text,
      quantity,
      order_number,
      unit_price::text,
      total_amount::text,
      advance_ratio_pct::text,
      payment_term_days,
      final_ratio_pct::text,
      actual_advance_date::text,
      actual_advance_amount::text,
      actual_final_date::text,
      actual_final_amount::text,
      remarks,
      created_by,
      created_at::text,
      updated_at::text;
  `;
  return rows[0] ? mapCashFlow(rows[0]) : null;
}

export async function deleteCashFlowEntryById(id: string): Promise<boolean> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<{ id: number }[]>`
    delete from cash_flow_entries
    where id = ${Number(id)}
    returning id;
  `;
  return rows.length > 0;
}

type CostAnalysisRow = {
  id: number;
  cm_region: string;
  supplier_name: string;
  sku: string;
  quantity: number;
  order_number: string;
  order_total_with_tariff: string | number;
  order_total_without_tariff: string | number;
  unit_cost_with_tariff: string | number;
  unit_cost_without_tariff: string | number;
  includes_china_vat: boolean;
  base_unit_cost_usd: string | number;
  ee_cost: string | number;
  me_cost: string | number;
  assembly_cost: string | number;
  tariff_pct: string | number;
  air_freight_per_unit: string | number;
  sea_freight_per_unit: string | number;
  destination_country: string;
  freight_mode: string;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

function mapCostAnalysis(row: CostAnalysisRow): CostAnalysisEntry {
  const mode = row.freight_mode === "air" ? "air" : "sea";
  return {
    id: String(row.id),
    cmRegion: row.cm_region || "",
    supplierName: row.supplier_name || "",
    sku: row.sku,
    quantity: Number(row.quantity ?? 0),
    orderNumber: row.order_number,
    orderTotalWithTariff: Number(row.order_total_with_tariff ?? 0),
    orderTotalWithoutTariff: Number(row.order_total_without_tariff ?? 0),
    unitCostWithTariff: Number(row.unit_cost_with_tariff ?? 0),
    unitCostWithoutTariff: Number(row.unit_cost_without_tariff ?? 0),
    includesChinaVat: Boolean(row.includes_china_vat),
    baseUnitCostUsd: Number(row.base_unit_cost_usd ?? 0),
    eeCost: Number(row.ee_cost ?? 0),
    meCost: Number(row.me_cost ?? 0),
    assemblyCost: Number(row.assembly_cost ?? 0),
    tariffPct: Number(row.tariff_pct ?? 0),
    airFreightPerUnit: Number(row.air_freight_per_unit ?? 0),
    seaFreightPerUnit: Number(row.sea_freight_per_unit ?? 0),
    destinationCountry: row.destination_country || "",
    freightMode: mode as CostFreightMode,
    remarks: row.remarks || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCostAnalysisEntries(): Promise<CostAnalysisEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<CostAnalysisRow[]>`
    select
      id,
      cm_region,
      supplier_name,
      sku,
      quantity,
      order_number,
      order_total_with_tariff::text,
      order_total_without_tariff::text,
      unit_cost_with_tariff::text,
      unit_cost_without_tariff::text,
      includes_china_vat,
      base_unit_cost_usd::text,
      ee_cost::text,
      me_cost::text,
      assembly_cost::text,
      tariff_pct::text,
      air_freight_per_unit::text,
      sea_freight_per_unit::text,
      destination_country,
      freight_mode,
      remarks,
      created_by,
      created_at::text,
      updated_at::text
    from cost_analysis_entries
    order by id desc
    limit 2000;
  `;
  return rows.map(mapCostAnalysis);
}

export type CostAnalysisInput = {
  cmRegion: string;
  supplierName: string;
  sku: string;
  quantity: number;
  orderNumber: string;
  orderTotalWithTariff: number;
  orderTotalWithoutTariff: number;
  unitCostWithTariff: number;
  unitCostWithoutTariff: number;
  includesChinaVat: boolean;
  baseUnitCostUsd: number;
  eeCost: number;
  meCost: number;
  assemblyCost: number;
  tariffPct: number;
  airFreightPerUnit: number;
  seaFreightPerUnit: number;
  destinationCountry: string;
  freightMode: CostFreightMode;
  remarks: string;
};

export async function createCostAnalysisEntry(
  input: CostAnalysisInput & { createdBy: string },
): Promise<CostAnalysisEntry> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<CostAnalysisRow[]>`
    insert into cost_analysis_entries (
      cm_region,
      supplier_name,
      sku,
      quantity,
      order_number,
      order_total_with_tariff,
      order_total_without_tariff,
      unit_cost_with_tariff,
      unit_cost_without_tariff,
      includes_china_vat,
      base_unit_cost_usd,
      ee_cost,
      me_cost,
      assembly_cost,
      tariff_pct,
      air_freight_per_unit,
      sea_freight_per_unit,
      destination_country,
      freight_mode,
      remarks,
      created_by
    )
    values (
      ${input.cmRegion.trim()},
      ${input.supplierName.trim()},
      ${input.sku.trim()},
      ${input.quantity},
      ${input.orderNumber.trim()},
      ${input.orderTotalWithTariff},
      ${input.orderTotalWithoutTariff},
      ${input.unitCostWithTariff},
      ${input.unitCostWithoutTariff},
      ${input.includesChinaVat},
      ${input.baseUnitCostUsd},
      ${input.eeCost},
      ${input.meCost},
      ${input.assemblyCost},
      ${input.tariffPct},
      ${input.airFreightPerUnit},
      ${input.seaFreightPerUnit},
      ${input.destinationCountry.trim()},
      ${input.freightMode},
      ${input.remarks.trim()},
      ${input.createdBy}
    )
    returning
      id,
      cm_region,
      supplier_name,
      sku,
      quantity,
      order_number,
      order_total_with_tariff::text,
      order_total_without_tariff::text,
      unit_cost_with_tariff::text,
      unit_cost_without_tariff::text,
      includes_china_vat,
      base_unit_cost_usd::text,
      ee_cost::text,
      me_cost::text,
      assembly_cost::text,
      tariff_pct::text,
      air_freight_per_unit::text,
      sea_freight_per_unit::text,
      destination_country,
      freight_mode,
      remarks,
      created_by,
      created_at::text,
      updated_at::text;
  `;
  if (!rows[0]) throw new Error("Create cost analysis entry failed");
  return mapCostAnalysis(rows[0]);
}

export async function updateCostAnalysisEntryById(
  id: string,
  input: CostAnalysisInput,
): Promise<CostAnalysisEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<CostAnalysisRow[]>`
    update cost_analysis_entries
    set
      cm_region = ${input.cmRegion.trim()},
      supplier_name = ${input.supplierName.trim()},
      sku = ${input.sku.trim()},
      quantity = ${input.quantity},
      order_number = ${input.orderNumber.trim()},
      order_total_with_tariff = ${input.orderTotalWithTariff},
      order_total_without_tariff = ${input.orderTotalWithoutTariff},
      unit_cost_with_tariff = ${input.unitCostWithTariff},
      unit_cost_without_tariff = ${input.unitCostWithoutTariff},
      includes_china_vat = ${input.includesChinaVat},
      base_unit_cost_usd = ${input.baseUnitCostUsd},
      ee_cost = ${input.eeCost},
      me_cost = ${input.meCost},
      assembly_cost = ${input.assemblyCost},
      tariff_pct = ${input.tariffPct},
      air_freight_per_unit = ${input.airFreightPerUnit},
      sea_freight_per_unit = ${input.seaFreightPerUnit},
      destination_country = ${input.destinationCountry.trim()},
      freight_mode = ${input.freightMode},
      remarks = ${input.remarks.trim()},
      updated_at = now()
    where id = ${Number(id)}
    returning
      id,
      cm_region,
      supplier_name,
      sku,
      quantity,
      order_number,
      order_total_with_tariff::text,
      order_total_without_tariff::text,
      unit_cost_with_tariff::text,
      unit_cost_without_tariff::text,
      includes_china_vat,
      base_unit_cost_usd::text,
      ee_cost::text,
      me_cost::text,
      assembly_cost::text,
      tariff_pct::text,
      air_freight_per_unit::text,
      sea_freight_per_unit::text,
      destination_country,
      freight_mode,
      remarks,
      created_by,
      created_at::text,
      updated_at::text;
  `;
  return rows[0] ? mapCostAnalysis(rows[0]) : null;
}

export async function deleteCostAnalysisEntryById(id: string): Promise<boolean> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<{ id: number }[]>`
    delete from cost_analysis_entries
    where id = ${Number(id)}
    returning id;
  `;
  return rows.length > 0;
}
