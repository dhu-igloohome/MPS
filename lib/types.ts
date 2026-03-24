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
  office: string;
  productName: string;
  sku: string;
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
