import type { ForecastIncoterm } from "@/lib/forecast-incoterm";

export type { ForecastIncoterm };

export type Region = "APAC" | "EU" | "USA";

/** Persisted on forecast_cash_flow_settings for landed cost / departure logic. */
export type ForecastCashFlowShippingMode = "ocean" | "air";

export type UserRole = "super_admin" | "regional_admin";

export type UserAccount = {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  regions: Region[];
};

export type SessionPayload = {
  username: string;
  displayName: string;
  role: UserRole;
  regions: Region[];
};

export type AdminUser = {
  username: string;
  displayName: string;
  role: UserRole;
  regions: Region[];
  createdAt: string;
};

export type AdminAuditLog = {
  id: string;
  actorUsername: string;
  action: string;
  targetUsername: string;
  details: string;
  createdAt: string;
};

export type ForecastEntry = {
  id: string;
  month: string;
  region: Region;
  destination: string;
  /** EXW / FOB / DAP / DDP — trade term for the forecast line */
  incoterm: ForecastIncoterm;
  poNumber: string;
  productName: string;
  sku: string;
  remark: string;
  buildToOrder: number;
  buildToStock: number;
  createdBy: string;
  createdAt: string;
};

export type ProductItem = {
  id: string;
  productName: string;
  sku: string;
  variant: string;
  unitCost: number;
  articleNumber: string;
  isActive: boolean;
  createdAt: string;
};

export type SupplierEntry = {
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
  createdAt: string;
  updatedAt: string;
};

export type ContractStatus = "draft" | "approved" | "sent";

export type BomStatus = "draft" | "released" | "obsolete";

export type BomEntry = {
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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ToolingStatus = "design" | "in_use" | "maintenance" | "scrapped";
export type ToolingType = "mold" | "fixture" | "gauge" | "tester";

export type ToolingEntry = {
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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type EcnStatus = "draft" | "under_review" | "approved" | "implemented" | "rejected";
export type EcnPriority = "low" | "medium" | "high";

export type EcnEntry = {
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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type SopStatus = "draft" | "in_review" | "released" | "obsolete";

export type SopEntry = {
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
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type QcTestCaseStatus = "draft" | "reviewed" | "released" | "obsolete";
export type QcTestCasePriority = "P0" | "P1" | "P2";
export type QcTestCaseCategory = "functional" | "security" | "reliability" | "compatibility" | "ota" | "performance";

export type QcTestCaseEntry = {
  id: string;
  testCaseId: string;
  title: string;
  productSku: string;
  firmwareVersion: string;
  moduleName: string;
  category: QcTestCaseCategory;
  priority: QcTestCasePriority;
  status: QcTestCaseStatus;
  preconditions: string;
  steps: string;
  expectedResult: string;
  environment: string;
  owner: string;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type QcCertificationStatus = "planning" | "in_progress" | "approved" | "expired" | "withdrawn";

export type QcCertificationEntry = {
  id: string;
  certificateNo: string;
  productSku: string;
  productName: string;
  region: string;
  standardName: string;
  certBody: string;
  status: QcCertificationStatus;
  applicationDate: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  reportUrl: string;
  owner: string;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type QcOrtResult = "on_going" | "pass" | "fail";

export type QcOrtReportEntry = {
  id: string;
  ortNo: string;
  productSku: string;
  batchNo: string;
  factory: string;
  sampleSize: number;
  testItems: string;
  environmentProfile: string;
  duration: string;
  resultSummary: QcOrtResult;
  failCount: number;
  failModes: string;
  actionTaken: string;
  owner: string;
  startDate: string | null;
  endDate: string | null;
  reportUrl: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type Qc8dStatus = "open" | "containment" | "root_caused" | "implemented" | "verified" | "closed";
export type Qc8dSeverity = "S1" | "S2" | "S3" | "S4";

export type Qc8dReportEntry = {
  id: string;
  reportNo: string;
  issueTitle: string;
  productSku: string;
  customer: string;
  region: string;
  severity: Qc8dSeverity;
  status: Qc8dStatus;
  owner: string;
  d3Containment: string;
  d4RootCause: string;
  d5CorrectiveAction: string;
  d6ImplementationPlan: string;
  dateOpened: string | null;
  dateClosed: string | null;
  affectedQuantity: number;
  costImpact: number;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ContractEntry = {
  id: string;
  orderProgressId: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  signedDate: string;
  sku: string;
  productName: string;
  batch: string;
  quantity: number;
  unitCost: number;
  totalAmount: number;
  deliveryDate: string;
  currency: string;
  paymentTerms: string;
  qualityRemarks: string;
  deliveryAddress: string;
  serialCode: string;
  bluetoothId: string;
  status: ContractStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** Order progress module uses US; session / forecasts use USA. */
export type OrderProgressRegion = "APAC" | "EU" | "US";

/** Mass production Kanban only: office bucket (users with APAC may select). */
export type MassProductionKanbanRegion = OrderProgressRegion | "Shenzhen office";

export function isMassProductionKanbanRegion(value: string): value is MassProductionKanbanRegion {
  return (
    value === "APAC" ||
    value === "EU" ||
    value === "US" ||
    value === "Shenzhen office"
  );
}

export type OrderProgressOrderType = "BTO" | "BTS";

export type OrderProgressStatus = "not_started" | "in_production" | "ready_to_ship";

export type OrderProgressDeliveryPlan = {
  id: string;
  expectedDeliveryDate: string;
  quantity: number;
  progress: OrderProgressStatus;
};

/** 按产品维护的工序模板（产品名称 + SKU，同 SKU 多 variant 共用）。 */
export type ProductionStepTemplateEntry = {
  id: string;
  sortOrder: number;
  label: string;
};

/** 订单行上的生产工序勾选实例（快照自模板）。 */
export type OrderProductionStep = {
  id: string;
  sortOrder: number;
  label: string;
  done: boolean;
  completedAt: string | null;
  completedBy: string | null;
};

export type OrderProgressEntry = {
  id: string;
  /** 业务订单号（可与 ERP/客户单号对应）。 */
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
  createdAt: string;
  updatedAt: string;
  /** 多批次交货；为空时表示仅使用主档 expectedDeliveryDate。 */
  deliveryPlans: OrderProgressDeliveryPlan[];
  /** 生产进度（工序打勾）；无模板时为空数组。 */
  productionSteps: OrderProductionStep[];
  /** 采购合同/PO 信息（生成附件时回存）。 */
  poNumber?: string | null;
  poBatch?: string;
  unitCostSnapshot?: number;
  poDeliveryDate?: string | null;
  poSerialCode?: string;
  poBluetoothId?: string;
};

export type OrderProgressDeletionLog = {
  id: string;
  orderProgressId: string;
  orderNumber: string;
  forecastNumber: string;
  sku: string;
  region: OrderProgressRegion;
  reason: string;
  deletedBy: string;
  deletedAt: string;
};

/** Mass production Kanban row (dedicated page `/mass-production-kanban`). */
export type MassProductionKanbanEntry = {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  variant: string;
  quantity: number;
  mp: string;
  ee: string | null;
  me: string | null;
  smt: string | null;
  assembly: string | null;
  productionReport: string | null;
  ort: string | null;
  cooApproval: string | null;
  deliver: string | null;
  region: MassProductionKanbanRegion;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** 物流节点：工厂/供应商侧或各区域办公室（仅记录，不做库存扣账）。 */
export type LogisticsLocation = "FACTORY" | OrderProgressRegion;

export type LogisticsMovementType = "inbound" | "transfer";

export type LogisticsShipmentStatus = "not_shipped" | "in_transit" | "delivered" | "cancelled";

export type LogisticsShipmentEntry = {
  id: string;
  movementType: LogisticsMovementType;
  productName: string;
  sku: string;
  poNumber: string;
  quantity: number;
  fromLocation: LogisticsLocation;
  toLocation: LogisticsLocation;
  /** 可选关联订单进度行 */
  orderProgressId: string | null;
  trackingNumber: string;
  carrier: string;
  status: LogisticsShipmentStatus;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type ShippingReportEntry = {
  id: string;
  sn: string;
  dateReleased: string | null;
  consigneeCompanyName: string;
  doGrnNumber: string;
  soCoReferenceNumber: string;
  podLink: string;
  sku: string;
  accessoryQuantity: number;
  accessoryNumber: string;
  requestBy: string;
  poNumber: string;
  btoBts: string;
  purpose: string;
  shipFrom: string;
  shipTo: string;
  shipToRegion: string;
  shippingMode: string;
  shippingMethod: string;
  trackingNumber: string;
  costCentre: string;
  paidByIgloo: number;
  paidByCustomer: number;
  sgdPaidByIgloo: number;
  sgdPaidByCustomer: number;
  usd: number;
  productSerialNo: string;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** Saved snapshot from Logistics → Landed cost consolidate (POST). */
export type LogisticsLandedCostConsolidateLineItem = {
  forecastId: string;
  sku: string;
  buildToOrder: number;
  buildToStock: number;
  quantity: number;
  region: Region;
  month: string;
  productName: string;
};

export type LogisticsLandedCostConsolidateSnapshot = {
  id: string;
  poNumber: string;
  quoteDate: string;
  destinationCountry: string;
  destinationTariffPct: number | null;
  seaFreightUsd: number | null;
  airFreightUsd: number | null;
  incoterm: ForecastIncoterm;
  consolidatedUsd: number | null;
  lineItems: LogisticsLandedCostConsolidateLineItem[];
  createdBy: string;
  createdAt: string;
  /** Last update time when an existing row was overwritten (same PO + same user). */
  updatedAt: string | null;
};

export type InventoryGlobalEntry = {
  id: string;
  mainSku: string;
  variantSku: string;
  batch: string;
  batchNoSn: string;
  goodToReleaseShipmentFromCm: number;
  status: string;
  description: string;
  stockQtyAvailableForFulfillment: number;
  reservedQty: number;
  batchesBalanceQty: number;
  mpBatchProducedQty: number;
  dkksFactory: number;
  huiliFactory: number;
  bolanFactory: number;
  jiadunFactory: number;
  jinjianFactory: number;
  huameiFactory: number;
  shenzhenOffice: number;
  taiwanFuhshing: number;
  singaporeOffice: number;
  cargohubWarehouse: number;
  koreaSolityFactory: number;
  vietnamSolityFactory: number;
  aztechFactory: number;
  swrFactory: number;
  vsFactory: number;
  ibeFactory: number;
  smartWarehousing: number;
  omniWarehouse: number;
  amazonFba: number;
  safetyStockAtAmazon: number;
  jdmWarehouse: number;
  amazon: number;
  syw: number;
  inTransitStock: number;
  inventoryReceivedDate: string | null;
  agingDaysC: number;
  unitPriceRmb: number;
  unitPriceUsd: number;
  batchesInventoryCostUsd: number;
  skuInventoryCostUsd: number;
  chinaInventoryCostUsd: number;
  singaporeInventoryCostUsd: number;
  singaporeCargohubInventoryCostUsd: number;
  koreaSolityInventoryCost: number;
  vietnamSolityInventoryCostUsd: number;
  usaOmniInventoryVostUsd: number;
  usAmazonFba: number;
  europeJdmInventoryCostUsd: number;
  inTransitInventoryCostUsd: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** 空运 / 海运（DB 存 air | sea） */
export type CostFreightMode = "air" | "sea";

/** 成本控制 — 成本分析（与 Excel 列一致） */
export type CostAnalysisEntry = {
  id: string;
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
  /** Excel「Unit cost」列（USD） */
  baseUnitCostUsd: number;
  eeCost: number;
  meCost: number;
  assemblyCost: number;
  /** 关税比例，如 39 表示 39% */
  tariffPct: number;
  airFreightPerUnit: number;
  seaFreightPerUnit: number;
  destinationCountry: string;
  freightMode: CostFreightMode;
  remarks: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

/** 单位成本报价 Incoterm（与报价行一致） */
export type UnitCostQuoteIncoterm = "EXW" | "FOB" | "DAP" | "DDP";

/** 成本控制 — 单位成本报价（历史记录多条按时间保留） */
export type UnitCostQuoteEntry = {
  id: string;
  sku: string;
  unitPrice: number;
  /** 报价是否含税 */
  taxIncluded: boolean;
  supplierName: string;
  quoteDate: string;
  /** 生产商国家 */
  manufacturerCountry: string;
  /** 目的国 */
  destinationCountry: string;
  /** 目的国关税比例 %，未填为 null */
  destinationTariffPct: number | null;
  /** 海运运费单价 (USD)，未填为 null */
  seaFreightUnitPrice: number | null;
  /** 空运运费单价 (USD)，未填为 null */
  airFreightUnitPrice: number | null;
  incoterm: UnitCostQuoteIncoterm;
  createdBy: string;
  createdAt: string;
};

/** Forecast cash flow table: forecast row + supplier pick + Unit cost quote price (USD). */
export type ForecastCashFlowRow = ForecastEntry & {
  cashFlowSupplierName: string;
  /** Latest Unit cost (USD) for this SKU + supplier, or null if none. */
  unitPriceUsd: number | null;
  /** PO / order issue date (YYYY-MM-DD), editable in cash flow dashboard; null if unset. */
  poIssueDate: string | null;
  /** Landed cost section: ocean vs air (persisted per forecast). */
  cashFlowShippingMode: ForecastCashFlowShippingMode;
  /** Latest unit cost quote for this SKU + supplier (quote_date desc), or null. */
  latestUnitCostQuote: UnitCostQuoteEntry | null;
  /** Logistics / landed consolidate: destination tariff % (0–100), null if unset. */
  cashFlowDestinationTariffPct: number | null;
  /** Logistics: freight USD per unit for the selected shipping mode row. */
  cashFlowFreightUsdPerUnit: number | null;
  /**
   * When set, overrides `ForecastEntry.incoterm` for cash-flow / logistics views only.
   * Null means use the forecast line’s incoterm.
   */
  cashFlowIncoterm: ForecastIncoterm | null;
};

/** 成本控制 — 现金流分析（与 Excel 列一致） */
export type CashFlowEntry = {
  id: string;
  sku: string;
  orderDate: string;
  quantity: number;
  /** 订单号（如 Forecast PO：POU…） */
  orderNumber: string;
  /** 订单金额：单价 */
  unitPrice: number;
  /** 订单总金额 */
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
  createdAt: string;
  updatedAt: string;
};
