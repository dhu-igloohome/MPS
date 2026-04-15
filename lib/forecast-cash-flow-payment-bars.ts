import type { ForecastPaySchedule } from "@/lib/forecast-supplier-payment-schedule";

export type FcPaymentBarRowInput = {
  row: { cashFlowSupplierName: string };
  schedule: ForecastPaySchedule | null;
  lineTotal: number | null;
};

/**
 * Bucket deposit / balance due amounts by calendar month (YYYY-MM) and supplier name.
 */
function addTo(
  map: Map<string, Map<string, number>>,
  monthKey: string,
  supplier: string,
  amount: number,
) {
  if (!monthKey || !Number.isFinite(amount) || amount === 0) return;
  let bySup = map.get(monthKey);
  if (!bySup) {
    bySup = new Map();
    map.set(monthKey, bySup);
  }
  const k = supplier.trim() || "—";
  bySup.set(k, (bySup.get(k) ?? 0) + amount);
}

/**
 * Build Recharts-friendly rows for stacked deposit / balance bars (current month ±6).
 */
export function buildForecastCashPaymentBarData(
  items: FcPaymentBarRowInput[],
  monthKeys: string[],
  monthLabelFn: (monthKey: string) => string,
): {
  chartData: Record<string, string | number>[];
  suppliers: string[];
} {
  const depositByMonth = new Map<string, Map<string, number>>();
  const balanceByMonth = new Map<string, Map<string, number>>();
  const supplierSet = new Set<string>();

  for (const it of items) {
    const sch = it.schedule;
    if (!sch || sch.parseFailed || it.lineTotal == null) continue;
    const sup = it.row.cashFlowSupplierName.trim() || "—";

    if (sch.deposit) {
      const mk = sch.deposit.dateYmd.slice(0, 7);
      addTo(depositByMonth, mk, sup, sch.deposit.amountUsd);
      supplierSet.add(sup);
    }
    if (sch.balance) {
      const mk = sch.balance.dateYmd.slice(0, 7);
      addTo(balanceByMonth, mk, sup, sch.balance.amountUsd);
      supplierSet.add(sup);
    }
  }

  const suppliers = Array.from(supplierSet).sort((a, b) => a.localeCompare(b));

  const chartData = monthKeys.map((mk) => {
    const row: Record<string, string | number> = {
      monthKey: mk,
      name: monthLabelFn(mk),
    };
    const depM = depositByMonth.get(mk);
    const balM = balanceByMonth.get(mk);
    let depSum = 0;
    let balSum = 0;
    suppliers.forEach((s, i) => {
      const dv = depM?.get(s) ?? 0;
      const bv = balM?.get(s) ?? 0;
      row[`d${i}`] = Math.round(dv * 100) / 100;
      row[`b${i}`] = Math.round(bv * 100) / 100;
      depSum += dv;
      balSum += bv;
    });
    row.depositTotal = Math.round(depSum * 100) / 100;
    row.balanceTotal = Math.round(balSum * 100) / 100;
    /** Sum of scheduled deposits + balances in this month (for bar-top labels). */
    row.monthTotal = Math.round((depSum + balSum) * 100) / 100;
    /** Y-axis anchor: top of the taller of the two side-by-side stacks (deposits vs balances). */
    row.monthLabelY = Math.round(Math.max(depSum, balSum) * 100) / 100;
    return row;
  });

  return { chartData, suppliers };
}
