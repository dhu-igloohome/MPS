"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  aggregateToQuarters,
  buildMonthlyChartSeries,
  type ChartPoint,
  type DashboardFilters,
  drillOrdersForOrderMonth,
  drillOrdersForQuarter,
  enrichCashFlowRows,
  type EnrichedCashFlow,
  filterEnriched,
  getDateRangePreset,
  computeKpis,
  paymentMonthWindowAroundToday,
  sumActualPaid,
  type PeriodGrain,
  type RangePreset,
} from "@/lib/cash-flow-dashboard-agg";
import { formatUsd } from "@/lib/format-usd";
import type { Language } from "@/lib/i18n";
import type { CashFlowEntry, CostAnalysisEntry } from "@/lib/types";

type Props = {
  language: Language;
  entries: CashFlowEntry[];
  costAnalysisEntries: CostAnalysisEntry[];
};

const COLORS = {
  slate: "#334155",
  emerald: "#059669",
  amber: "#d97706",
  blue: "#2563eb",
  indigo: "#4f46e5",
};

function optNum(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function labels(language: Language) {
  const en = language === "en";
  return {
    title: en ? "Cash flow dashboard" : "现金流可视化看板",
    subtitle: en
      ? "Overview & drill-down — data refreshes with your filters (order date range)."
      : "概览与下钻 — 随筛选实时更新（按下单日期范围过滤订单）。",
    kpiOrderTotal: en ? "Order total (due)" : "订单总金额（应付）",
    kpiActualPaid: en ? "Actually paid" : "实际支付合计",
    kpiUnpaid: en ? "Outstanding" : "应付未付",
    kpiAvgDays: en ? "Avg. pay lag (days)" : "平均支付周期（天）",
    kpiHintUnpaid: en ? "Order total − actual paid" : "订单总金额 − 实际预付 − 实际尾款",
    kpiHintAvg: en ? "Avg. days from order date to each actual payment" : "下单日至各笔实际付款日的平均间隔",
    range: en ? "Time range" : "时间范围",
    preset12: en ? "Last 12 months" : "近 12 个月",
    presetYtd: en ? "Year to date" : "本年",
    presetCustom: en ? "Custom" : "自定义",
    from: en ? "From" : "从",
    to: en ? "To" : "至",
    grain: en ? "Granularity" : "时间粒度",
    month: en ? "Month" : "月",
    quarter: en ? "Quarter" : "季度",
    supplier: en ? "Supplier" : "供应商",
    all: en ? "All" : "全部",
    qtyMin: en ? "Qty min" : "数量 ≥",
    qtyMax: en ? "Qty max" : "数量 ≤",
    totalMin: en ? "Order total min" : "订单总金额 ≥",
    totalMax: en ? "Order total max" : "订单总金额 ≤",
    advMin: en ? "Actual advance min" : "实际预付 ≥",
    advMax: en ? "Actual advance max" : "实际预付 ≤",
    finMin: en ? "Actual final min" : "实际尾款 ≥",
    finMax: en ? "Actual final max" : "实际尾款 ≤",
    resetFilters: en ? "Reset filters" : "重置筛选",
    lineTitle: en ? "Order total (by order month) vs cash paid (by payment month)" : "下单额（按下单月）vs 实付发生额（按付款月）",
    lineHint: en
      ? "Same calendar window as the chart below (current month ±6). Blue: order totals by order month. Green: advance+final cash by payment month."
      : "横轴与下图一致（当前月 ±6 个自然月）。蓝线：按下单月汇总订单金额；绿线：按付款月汇总实付（预付+尾款）。",
    barTitle: en ? "Actual advance vs actual final (by payment month)" : "实际预付 vs 实际尾款（按付款月）",
    barHint: en
      ? "Payment months: 6 months before through 6 months after the current month (rolling window)."
      : "付款月范围：以当前月为基准，向前 6 个月至向后 6 个月（共 13 个自然月）。",
    waterfallTitle: en ? "Payment composition (filtered total)" : "资金构成（当前筛选合计）",
    wfOrder: en ? "Order total" : "订单合计",
    wfAdv: en ? "Paid advance" : "已付预付",
    wfFin: en ? "Paid final" : "已付尾款",
    wfUnpaid: en ? "Outstanding" : "应付未付",
    drillTitle: en ? "Orders in period" : "本周期订单明细",
    close: en ? "Close" : "关闭",
    colOrder: en ? "Order no." : "订单号",
    colSku: "SKU",
    colTotal: en ? "Order total" : "订单总金额",
    colAdv: en ? "Actual advance" : "实际预付",
    colFin: en ? "Actual final" : "实际尾款",
    colAdvDate: en ? "Adv. date" : "预付日期",
    colFinDate: en ? "Final date" : "尾款日期",
    colSupplier: en ? "Supplier" : "供应商",
    openProgress: en ? "Order progress" : "订单进度",
    clickDrill: en ? "Click a bar or point to drill down" : "点击柱形或折线点查看该期订单",
    na: en ? "—" : "—",
  };
}

function ChartTooltip({
  active,
  payload,
  label,
  language,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  language: Language;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-app-border bg-white/95 px-3 py-2 text-xs shadow-[0_8px_24px_rgba(17,24,39,0.08)] backdrop-blur">
      <p className="mb-1 font-medium text-[#111827]">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="tabular-nums text-[#4B5563]">
          <span style={{ color: p.color }}>{p.name}: </span>
          {formatUsd(Number(p.value), 2)}
        </p>
      ))}
    </div>
  );
}

export function CashFlowDashboard({ language, entries, costAnalysisEntries }: Props) {
  const t = labels(language);
  const [rangePreset, setRangePreset] = useState<RangePreset>("12m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [grain, setGrain] = useState<PeriodGrain>("month");
  const [supplier, setSupplier] = useState("");
  const [qtyMin, setQtyMin] = useState("");
  const [qtyMax, setQtyMax] = useState("");
  const [totalMin, setTotalMin] = useState("");
  const [totalMax, setTotalMax] = useState("");
  const [advMin, setAdvMin] = useState("");
  const [advMax, setAdvMax] = useState("");
  const [finMin, setFinMin] = useState("");
  const [finMax, setFinMax] = useState("");
  const [drill, setDrill] = useState<{ periodLabel: string; rows: EnrichedCashFlow[] } | null>(null);

  const enriched = useMemo(() => enrichCashFlowRows(entries, costAnalysisEntries), [entries, costAnalysisEntries]);

  const supplierOptions = useMemo(() => {
    const s = new Set(enriched.map((e) => e.supplier).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [enriched]);

  const dateRange = useMemo(
    () => getDateRangePreset(rangePreset, customFrom, customTo),
    [rangePreset, customFrom, customTo],
  );

  const filters: DashboardFilters = useMemo(
    () => ({
      supplier,
      qtyMin: optNum(qtyMin),
      qtyMax: optNum(qtyMax),
      totalMin: optNum(totalMin),
      totalMax: optNum(totalMax),
      advMin: optNum(advMin),
      advMax: optNum(advMax),
      finMin: optNum(finMin),
      finMax: optNum(finMax),
    }),
    [supplier, qtyMin, qtyMax, totalMin, totalMax, advMin, advMax, finMin, finMax],
  );

  const filtered = useMemo(
    () => filterEnriched(enriched, filters, dateRange.from, dateRange.to),
    [enriched, filters, dateRange.from, dateRange.to],
  );

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);

  /** Line + bar charts: fixed rolling month window (current month ±6) on the X-axis; still filtered by order-date range above. */
  const rollingPaymentMonthChartPoints: ChartPoint[] = useMemo(() => {
    const months = paymentMonthWindowAroundToday(6, 6);
    if (months.length === 0) return [];
    const monthly = buildMonthlyChartSeries(filtered, months);
    return grain === "month" ? monthly : aggregateToQuarters(monthly);
  }, [filtered, grain]);

  const wf = useMemo(() => {
    const advSum = filtered.reduce((s, e) => s + (e.actualAdvanceAmount ?? 0), 0);
    const finSum = filtered.reduce((s, e) => s + (e.actualFinalAmount ?? 0), 0);
    return {
      order: kpis.orderTotal,
      adv: advSum,
      fin: finSum,
      unpaid: kpis.unpaid,
    };
  }, [filtered, kpis.orderTotal, kpis.unpaid]);

  const openDrill = useCallback(
    (periodKey: string) => {
      const rows =
        grain === "month" ? drillOrdersForOrderMonth(filtered, periodKey) : drillOrdersForQuarter(filtered, periodKey);
      setDrill({ periodLabel: periodKey, rows });
    },
    [filtered, grain],
  );

  const resetFilters = () => {
    setSupplier("");
    setQtyMin("");
    setQtyMax("");
    setTotalMin("");
    setTotalMax("");
    setAdvMin("");
    setAdvMax("");
    setFinMin("");
    setFinMax("");
  };

  const rollingChartData = rollingPaymentMonthChartPoints.map((p) => ({
    ...p,
    name: p.label,
  }));

  return (
    <div className="mb-10 space-y-6">
      <div>
        <h4 className="text-base font-semibold tracking-tight text-[#111827]">{t.title}</h4>
        <p className="mt-1 text-sm text-[#4B5563]">{t.subtitle}</p>
      </div>

      <div className="app-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 xl:items-end">
          <label className="text-xs font-medium text-[#4B5563]">
            {t.range}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={rangePreset}
              onChange={(e) => setRangePreset(e.target.value as RangePreset)}
            >
              <option value="12m">{t.preset12}</option>
              <option value="ytd">{t.presetYtd}</option>
              <option value="custom">{t.presetCustom}</option>
            </select>
          </label>
          {rangePreset === "custom" ? (
            <>
              <label className="text-xs font-medium text-[#4B5563]">
                {t.from}
                <input
                  type="date"
                  className="mt-1 w-full bg-white px-3 py-2 text-sm"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-[#4B5563]">
                {t.to}
                <input
                  type="date"
                  className="mt-1 w-full bg-white px-3 py-2 text-sm"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </label>
            </>
          ) : (
            <div className="md:col-span-2 text-xs text-[#9CA3AF]">
              {dateRange.from} → {dateRange.to}
            </div>
          )}
          <label className="text-xs font-medium text-[#4B5563]">
            {t.grain}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={grain}
              onChange={(e) => setGrain(e.target.value as PeriodGrain)}
            >
              <option value="month">{t.month}</option>
              <option value="quarter">{t.quarter}</option>
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-700 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs font-medium text-[#4B5563]">
            {t.supplier}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            >
              <option value="">{t.all}</option>
              {supplierOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            {t.qtyMin}
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={qtyMin}
              onChange={(e) => setQtyMin(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            {t.qtyMax}
            <input
              type="number"
              min={0}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={qtyMax}
              onChange={(e) => setQtyMax(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            {t.totalMin}
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={totalMin}
              onChange={(e) => setTotalMin(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            {t.totalMax}
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={totalMax}
              onChange={(e) => setTotalMax(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={resetFilters}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t.resetFilters}
            </button>
          </div>
          <label className="text-xs font-medium text-[#4B5563]">
            {t.advMin}
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={advMin}
              onChange={(e) => setAdvMin(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            {t.advMax}
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={advMax}
              onChange={(e) => setAdvMax(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            {t.finMin}
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={finMin}
              onChange={(e) => setFinMin(e.target.value)}
            />
          </label>
          <label className="text-xs font-medium text-[#4B5563]">
            {t.finMax}
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={finMax}
              onChange={(e) => setFinMax(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF] dark:text-slate-400">{t.kpiOrderTotal}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
            {formatUsd(kpis.orderTotal, 2)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF] dark:text-slate-400">{t.kpiActualPaid}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">
            {formatUsd(kpis.actualPaid, 2)}
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF] dark:text-slate-400">{t.kpiUnpaid}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">
            {formatUsd(kpis.unpaid, 2)}
          </p>
          <p className="mt-1 text-xs text-slate-400">{t.kpiHintUnpaid}</p>
        </article>
        <article className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF] dark:text-slate-400">{t.kpiAvgDays}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">
            {kpis.avgPayDays != null ? kpis.avgPayDays.toFixed(1) : t.na}
          </p>
          <p className="mt-1 text-xs text-slate-400">{t.kpiHintAvg}</p>
        </article>
      </div>

      <p className="text-xs text-[#9CA3AF]">{t.clickDrill}</p>

      <div className="grid gap-6 xl:grid-cols-1">
        <div className="app-card p-4">
          <h5 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{t.lineTitle}</h5>
          <p className="mb-4 text-xs text-[#9CA3AF]">{t.lineHint}</p>
          <div className="h-72 w-full">
            {rollingChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={rollingChartData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  onClick={(state) => {
                    const k = state && typeof state === "object" && "activeLabel" in state ? String(state.activeLabel ?? "") : "";
                    if (k) openDrill(k);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => formatUsd(Number(v), 0)} />
                  <Tooltip content={<ChartTooltip language={language} />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="orderTotalInPeriod"
                    name={language === "en" ? "Order total (order month)" : "下单额（下单月）"}
                    stroke={COLORS.blue}
                    strokeWidth={2}
                    dot={{ r: 3, cursor: "pointer" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="actualPaidInPeriod"
                    name={language === "en" ? "Paid in month" : "实付发生额（付款月）"}
                    stroke={COLORS.emerald}
                    strokeWidth={2}
                    dot={{ r: 3, cursor: "pointer" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-slate-400">{t.na}</p>
            )}
          </div>
        </div>

        <div className="app-card p-4">
          <h5 className="mb-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{t.barTitle}</h5>
          <p className="mb-4 text-xs text-[#9CA3AF]">{t.barHint}</p>
          <div className="h-72 w-full">
            {rollingChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rollingChartData}
                  margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
                  onClick={(state) => {
                    const k =
                      state && typeof state === "object" && "activeLabel" in state
                        ? String(state.activeLabel ?? "")
                        : "";
                    if (k) openDrill(k);
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#64748b" tickFormatter={(v) => formatUsd(Number(v), 0)} />
                  <Tooltip content={<ChartTooltip language={language} />} />
                  <Legend />
                  <Bar
                    dataKey="advancePaidInPeriod"
                    name={language === "en" ? "Actual advance" : "实际预付"}
                    fill={COLORS.indigo}
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                  >
                    {rollingChartData.map((_, i) => (
                      <Cell key={`a-${i}`} cursor="pointer" />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="finalPaidInPeriod"
                    name={language === "en" ? "Actual final" : "实际尾款"}
                    fill={COLORS.emerald}
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                  >
                    {rollingChartData.map((_, i) => (
                      <Cell key={`f-${i}`} cursor="pointer" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-slate-400">{t.na}</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-900/80 dark:to-slate-900/40">
          <h5 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{t.waterfallTitle}</h5>
          <div className="flex flex-wrap items-stretch justify-between gap-3">
            <div className="min-w-[7rem] flex-1 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-center dark:border-slate-600 dark:bg-slate-800/50">
              <p className="text-xs text-[#9CA3AF]">{t.wfOrder}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
                {formatUsd(wf.order, 2)}
              </p>
            </div>
            <div className="flex items-center text-slate-400">−</div>
            <div className="min-w-[7rem] flex-1 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-center dark:border-slate-600 dark:bg-slate-800/50">
              <p className="text-xs text-[#9CA3AF]">{t.wfAdv}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-indigo-600 dark:text-indigo-200">
                {formatUsd(wf.adv, 2)}
              </p>
            </div>
            <div className="flex items-center text-slate-400">−</div>
            <div className="min-w-[7rem] flex-1 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-center dark:border-slate-600 dark:bg-slate-800/50">
              <p className="text-xs text-[#9CA3AF]">{t.wfFin}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">
                {formatUsd(wf.fin, 2)}
              </p>
            </div>
            <div className="flex items-center text-slate-400">=</div>
            <div className="min-w-[7rem] flex-1 rounded-xl border border-amber-200/90 bg-amber-50/90 px-4 py-3 text-center dark:border-amber-800/50 dark:bg-amber-950/40">
              <p className="text-xs text-amber-800/80 dark:text-amber-200/90">{t.wfUnpaid}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-amber-800 dark:text-amber-200">
                {formatUsd(wf.unpaid, 2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {drill ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-app-border bg-white shadow-[0_24px_60px_rgba(17,24,39,0.18)]">
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t.drillTitle} · {drill.periodLabel}
              </h3>
              <button
                type="button"
                className="app-button-secondary px-3 py-1.5 text-sm"
                onClick={() => setDrill(null)}
              >
                {t.close}
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-4">
              <table className="w-full min-w-[720px] border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="py-2 pr-2">{t.colOrder}</th>
                    <th className="py-2 pr-2">{t.colSku}</th>
                    <th className="py-2 pr-2">{t.colSupplier}</th>
                    <th className="py-2 pr-2 text-right">{t.colTotal}</th>
                    <th className="py-2 pr-2 text-right">{t.colAdv}</th>
                    <th className="py-2 pr-2 text-right">{t.colFin}</th>
                    <th className="py-2 pr-2">{t.colAdvDate}</th>
                    <th className="py-2 pr-2">{t.colFinDate}</th>
                    <th className="py-2">{t.openProgress}</th>
                  </tr>
                </thead>
                <tbody>
                  {drill.rows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-400">
                        {t.na}
                      </td>
                    </tr>
                  ) : (
                    drill.rows.map((r) => (
                      <tr key={r.id} className="border-b border-app-border/60">
                        <td className="py-2 pr-2 font-medium">{r.orderNumber}</td>
                        <td className="py-2 pr-2">{r.sku}</td>
                        <td className="max-w-[10rem] truncate py-2 pr-2">{r.supplier}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{formatUsd(r.totalAmount, 2)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">
                          {r.actualAdvanceAmount != null ? formatUsd(r.actualAdvanceAmount, 2) : t.na}
                        </td>
                        <td className="py-2 pr-2 text-right tabular-nums">
                          {r.actualFinalAmount != null ? formatUsd(r.actualFinalAmount, 2) : t.na}
                        </td>
                        <td className="whitespace-nowrap py-2 pr-2">{r.actualAdvanceDate ?? t.na}</td>
                        <td className="whitespace-nowrap py-2 pr-2">{r.actualFinalDate ?? t.na}</td>
                        <td className="py-2">
                          <Link
                            href="/order-progress"
                            className="text-[var(--app-accent)] hover:underline"
                          >
                            {t.openProgress}
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
