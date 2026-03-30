export type Region = "APAC" | "EU" | "USA";

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
  createdAt: string;
  updatedAt: string;
};

export type ContractStatus = "draft" | "approved" | "sent";

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
