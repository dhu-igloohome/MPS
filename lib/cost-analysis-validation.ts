import type { CostFreightMode } from "@/lib/types";

export function validateCostAnalysisRow(input: {
  quantity: number;
  tariffPct: number;
  freightMode: CostFreightMode;
  eeCost: number;
  meCost: number;
  assemblyCost: number;
  airFreightPerUnit: number;
  seaFreightPerUnit: number;
}): { ok: true } | { ok: false; message: string } {
  if (Number.isNaN(input.quantity) || input.quantity < 0) {
    return { ok: false, message: "订单数量须为不小于 0 的整数。" };
  }
  if (Number.isNaN(input.tariffPct) || input.tariffPct < 0 || input.tariffPct > 100) {
    return { ok: false, message: "tariff 须在 0～100% 之间。" };
  }
  if (input.freightMode !== "air" && input.freightMode !== "sea") {
    return { ok: false, message: "运输方式须为 air（空运）或 sea（海运）。" };
  }
  const costs = [
    input.eeCost,
    input.meCost,
    input.assemblyCost,
    input.airFreightPerUnit,
    input.seaFreightPerUnit,
  ];
  if (costs.some((n) => Number.isNaN(n) || !Number.isFinite(n) || n < 0)) {
    return { ok: false, message: "EE / ME / assembly / 运费单价须为有效非负数。" };
  }
  return { ok: true };
}
