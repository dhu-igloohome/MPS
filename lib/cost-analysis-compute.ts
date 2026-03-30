import type { CostFreightMode } from "@/lib/types";

/** 目的地（与系统 Region 对齐） */
export const COST_DESTINATION_OPTIONS = ["APAC", "EU", "USA"] as const;
export type CostDestination = (typeof COST_DESTINATION_OPTIONS)[number];

export function parseDestination(raw: unknown): CostDestination | null {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase();
  if (s === "APAC" || s === "EU" || s === "USA") return s;
  if (s === "US") return "USA";
  return null;
}

export function parseChinaVat(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  const s = String(raw ?? "").trim();
  if (s === "是" || s === "yes" || s === "Y" || s === "1" || s.toLowerCase() === "true") return true;
  if (s === "否" || s === "no" || s === "N" || s === "0" || s.toLowerCase() === "false") return false;
  return false;
}

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function roundMoney4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * Unit cost = EE + ME + assembly
 * 不含关税单价 = Unit cost + 所选运输方式对应的运费单价（空运用 air，海运用 sea）
 * 含关税单价 = (1 + tariff%) × Unit cost + 同上运费单价
 * 订单全额 = 对应单价 × 数量
 */
export function computeCostAnalysisDerived(input: {
  eeCost: number;
  meCost: number;
  assemblyCost: number;
  tariffPct: number;
  airFreightPerUnit: number;
  seaFreightPerUnit: number;
  freightMode: CostFreightMode;
  quantity: number;
}): {
  baseUnitCostUsd: number;
  unitCostWithTariff: number;
  unitCostWithoutTariff: number;
  orderTotalWithTariff: number;
  orderTotalWithoutTariff: number;
} {
  const baseUnitCostUsd = roundMoney4(input.eeCost + input.meCost + input.assemblyCost);
  const freight = input.freightMode === "air" ? input.airFreightPerUnit : input.seaFreightPerUnit;
  const t = input.tariffPct / 100;
  const unitCostWithoutTariff = roundMoney4(baseUnitCostUsd + freight);
  const unitCostWithTariff = roundMoney4((1 + t) * baseUnitCostUsd + freight);
  const orderTotalWithTariff = roundMoney2(input.quantity * unitCostWithTariff);
  const orderTotalWithoutTariff = roundMoney2(input.quantity * unitCostWithoutTariff);
  return {
    baseUnitCostUsd,
    unitCostWithTariff,
    unitCostWithoutTariff,
    orderTotalWithTariff,
    orderTotalWithoutTariff,
  };
}
