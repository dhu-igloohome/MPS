"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
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
import { buildForecastCashPaymentBarData } from "@/lib/forecast-cash-flow-payment-bars";
import {
  buildLandedCostBarRowInputs,
  buildLandedCostPaymentBarData,
  type LandedCostBarSeriesMeta,
} from "@/lib/landed-cost-cash-flow-chart";
import {
  computeForecastPaymentSchedule,
  formatScheduleDateEnglish,
  type ForecastPaySchedule,
} from "@/lib/forecast-supplier-payment-schedule";
import {
  buildForecastDestinationOptions,
  forecastDestinationDisplay,
} from "@/lib/forecast-destination-countries";
import { formatUsd } from "@/lib/format-usd";
import {
  computeLandedCostPerUnitUsd,
  computeDepartureDateYmd,
  computePaymentDueYmd,
} from "@/lib/landed-cost-cash-flow";
import type { Language } from "@/lib/i18n";
import type {
  CashFlowEntry,
  CostAnalysisEntry,
  ForecastCashFlowRow,
  SupplierEntry,
  UnitCostQuoteEntry,
} from "@/lib/types";
import type { LabelContentType } from "recharts/types/component/Label";

type Props = {
  language: Language;
  entries: CashFlowEntry[];
  costAnalysisEntries: CostAnalysisEntry[];
  /** Ok-comment forecast rows with supplier / unit cost (same source as Forecast cash flow table). */
  forecastCashFlowRows?: ForecastCashFlowRow[];
  /** Supplier master (payment terms, lead time) from Supply Chain → Suppliers. */
  fcSuppliers?: SupplierEntry[];
  /** When true, show the Forecast summary table above KPIs (Supply Chain cost control). */
  showForecastCashFlowSummary?: boolean;
  onForecastCashFlowSettingsSaved?: (
    forecastId: string,
    payload: {
      supplierName: string;
      unitPriceUsd: number | null;
      poIssueDate: string | null;
      shippingMode: ForecastCashFlowRow["cashFlowShippingMode"];
      latestUnitCostQuote: UnitCostQuoteEntry | null;
    },
  ) => void;
  onForecastCashFlowSettingsError?: (message: string) => void;
  /** When true, only render Forecast cash flow (for dashboard) + payment bar chart (Cash flow analysis tab). */
  forecastSummaryOnly?: boolean;
};

function forecastLineTotalUsd(row: ForecastCashFlowRow): number | null {
  if (row.unitPriceUsd == null) return null;
  const qty = Number(row.buildToOrder) + Number(row.buildToStock);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return row.unitPriceUsd * qty;
}

/** English display for stored YYYY-MM-DD (avoids TZ shift around midnight). */
function formatPoIssueDateEnglish(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatForecastMonthCell(ym: string, language: Language): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return ym;
  if (language === "en") {
    return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return `${y}年${mo}月`;
}

const COLORS = {
  slate: "#334155",
  emerald: "#059669",
  amber: "#d97706",
  blue: "#2563eb",
  indigo: "#4f46e5",
};

/** Stacked deposit / balance segments by supplier index (Forecast payment bar chart). */
const FC_DEP_STACK = ["#4f46e5", "#6366f1", "#7c3aed", "#8b5cf6", "#a855f7", "#c084fc"];
const FC_BAL_STACK = ["#047857", "#059669", "#0d9488", "#10b981", "#34d399", "#6ee7b7"];
/** Landed cost stacked bars (one segment per forecast line). */
const LC_PAY_STACK = ["#0369a1", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd", "#4f46e5", "#6366f1", "#8b5cf6", "#a78bfa", "#c084fc", "#059669"];

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
    fcSummaryTitle: en ? "Forecast cash flow (for dashboard)" : "Forecast 现金流（看板汇总）",
    fcSummaryHint: en
      ? "Line total from Unit cost; PO issue date in English. Deposit / balance due dates use each supplier’s Payment terms + Lead time (calendar days): deposit on PO date; balance on PO + lead time + Net days from terms."
      : "行总金额来自单位成本；PO 日期英文显示。订金 / 尾款日期按「供应商」中的付款条款与 Lead time（自然日）推算：订金在 PO 日；尾款在 PO + 交期 + 条款中的 Net 天数。",
    fcColSupplier: en ? "Supplier name" : "供应商名称",
    fcColSku: "SKU",
    fcColBto: en ? "Build to Order" : "按单生产",
    fcColBts: en ? "Build to Stock" : "备货生产",
    fcColPoIssue: en ? "PO issue date" : "订单下达日期",
    fcColTotal: en ? "Total amount (USD)" : "总金额 (USD)",
    fcColDeposit: en ? "Deposit due" : "订金应付",
    fcColBalance: en ? "Balance due" : "尾款应付",
    fcPayUnknownSupplier: en ? "No matching supplier record." : "未找到供应商主数据。",
    fcPayNeedPoAndTotal: en ? "Set PO date, supplier, and line total." : "请设置订单日、供应商与可算行总金额。",
    fcPayParseTerms: en ? "Could not parse Payment terms; edit text in Suppliers." : "无法解析付款条款，请在供应商中调整描述。",
    fcSumDeposits: en ? "Σ deposits" : "订金合计",
    fcSumBalances: en ? "Σ balances" : "尾款合计",
    fcEmpty: en ? "No rows with a computable total (pick supplier + Unit cost quote)." : "暂无可计算总金额的行（请选择供应商并确保单位成本有报价）。",
    fcSumLabel: en ? "Sum (computable lines)" : "可计算行合计",
    fcNoRows: en
      ? "No forecast cash flow rows (Comment must be Ok on the Forecast page)."
      : "暂无 Forecast 现金流数据（请在 Forecast 页将评论设为 Ok）。",
    fcBarTitle: en ? "Scheduled payments by due month" : "按应付月份的订金与尾款",
    fcBarHint: en
      ? "Uses deposit/balance due dates from the table above, grouped by calendar month. Bars stack by supplier (left stack = deposits, right = balances). Window: 6 months before through 6 months after this month."
      : "按上方表格的订金/尾款应付日汇总到自然月；柱形按供应商堆叠（左堆订金、右堆尾款）。范围：当前月前 6 个月至后 6 个月。",
    fcBarDeposit: en ? "Deposit due" : "订金应付",
    fcBarBalance: en ? "Balance due" : "尾款应付",
    fcBarNoData: en ? "No payments fall in this 13-month window." : "该 13 个月内无应付金额。",
    lcTitle: en ? "Landed cost cash flow" : "Landed cost 现金流",
    lcHint: en
      ? "Same rows as the forecast table above (Comment = Ok). Landed cost uses Forecast incoterm FOB/DAP/DDP, latest Unit cost by SKU+supplier, and your shipping mode. Tariff must be set on the quote or landed cost shows —."
      : "与上方 Forecast 表相同（评论为 Ok）。到岸成本按 Forecast 贸易术语 FOB/DAP/DDP、SKU+供应商最新单位成本及所选运输方式计算；报价未填目的国关税时到岸成本显示「—」。",
    lcColMonth: en ? "Forecast Month" : "Forecast 月份",
    lcColForecastNo: en ? "Forecast #" : "Forecast #",
    lcColRegion: en ? "Region" : "区域",
    lcColDestination: en ? "Destination country" : "目的国",
    lcColSupplier: en ? "Supplier name" : "供应商名称",
    lcColMfr: en ? "Manufacturer country" : "生产商国家",
    lcColSku: "SKU",
    lcColBto: en ? "Build to Order" : "按单生产",
    lcColBts: en ? "Build to Stock" : "备货生产",
    lcColCreated: en ? "Created At" : "创建日期",
    lcColPoIssue: en ? "PO issue date" : "订单下达日期",
    lcColIncoterm: en ? "Incoterm" : "贸易术语",
    lcColShip: en ? "Shipping mode" : "运输方式",
    lcColDepart: en ? "Departure date" : "离港/发运日",
    lcColLanded: en ? "Landed cost" : "到岸成本（单价）",
    lcColTotal: en ? "Total amount (USD)" : "总金额 (USD)",
    lcColPayDue: en ? "Payment due" : "付款到期日",
    lcColComment: en ? "Comment" : "评论",
    lcShipOcean: en ? "Shipping: ocean" : "运输方式 · 海运",
    lcShipAir: en ? "Shipping: air" : "运输方式 · 空运",
    lcNoRows: en ? "No landed-cost rows (same rule as forecast cash flow)." : "暂无数据（与 Forecast 现金流相同条件）。",
    lcBarTitle: en ? "Landed cost payments by due month" : "Landed cost 按付款到期月",
    lcBarHint: en
      ? "Each stacked segment is one forecast line (SKU + destination). Amounts use Total amount (USD) and Payment due from the table above, grouped by calendar month. Window: 6 months before through 6 months after the current month."
      : "每个色块对应一行 Forecast（SKU + 目的国）。金额与上方表格的「总金额 (USD)」「付款到期日」一致，按自然月汇总。横轴范围：当前月前 6 个月至后 6 个月。",
    lcBarNoData: en ? "No landed-cost payments fall in this 13-month window." : "该 13 个月内无到期的 Landed cost 付款。",
    lcBarLegendHint: en
      ? "Many lines: legend is hidden — hover a bar for SKU, destination, total, and payment due."
      : "行数较多时已隐藏图例 — 悬停柱形可查看 SKU、目的国、总金额与付款到期日。",
    lcTipSku: "SKU",
    lcTipDest: en ? "Destination" : "目的国",
    lcTipTotal: en ? "Line total (USD)" : "行总金额 (USD)",
    lcTipDue: en ? "Payment due" : "付款到期日",
    lcTipMonthTotal: en ? "Month total" : "当月合计",
    lcSumLabel: en ? "Sum (lines with landed total)" : "可计算 landed 总金额的行合计",
    lcSumLineCount: en ? "computable / total lines" : "可算金额 / 总行数",
  };
}

function fcLabelCoord(v: number | string | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

/**
 * Recharts 3 LabelList → Label does not forward `payload` to custom `content` (non-SVG keys are stripped).
 * Use `index` + chart row, and read geometry from top-level props or `viewBox`.
 */
function fcBarLabelLayout(props: Record<string, unknown>): { cx: number; yTop: number } | null {
  const vbRaw = props.viewBox;
  const vb =
    vbRaw && typeof vbRaw === "object"
      ? (vbRaw as { x?: number | string; y?: number | string; width?: number | string })
      : undefined;
  const x = fcLabelCoord(props.x as number | string | undefined) ?? fcLabelCoord(vb?.x);
  const y = fcLabelCoord(props.y as number | string | undefined) ?? fcLabelCoord(vb?.y);
  const w = fcLabelCoord(props.width as number | string | undefined) ?? fcLabelCoord(vb?.width);
  if (x == null || y == null || w == null) return null;
  return { cx: x + w / 2, yTop: y };
}

/** Label at the top of a deposit or balance stack (one label per month per stack). */
function fcStackSumLabelContent(
  kind: "deposit" | "balance",
  stackIndex: number,
  stackSize: number,
  chartData: Record<string, string | number>[],
) {
  const labelFn = (props: Record<string, unknown>) => {
    const layout = fcBarLabelLayout(props);
    const monthIdx = typeof props.index === "number" ? props.index : Number(props.index);
    if (layout == null || !Number.isFinite(monthIdx) || monthIdx < 0 || monthIdx >= chartData.length) return null;
    const row = chartData[monthIdx];
    if (!row) return null;
    const keyPrefix = kind === "deposit" ? "d" : "b";
    const self = Number(row[`${keyPrefix}${stackIndex}`] ?? 0);
    if (!Number.isFinite(self) || self <= 0) return null;
    let topIdx = -1;
    for (let j = stackSize - 1; j >= 0; j--) {
      if (Number(row[`${keyPrefix}${j}`] ?? 0) > 0) {
        topIdx = j;
        break;
      }
    }
    if (stackIndex !== topIdx) return null;
    const total = Number(kind === "deposit" ? row.depositTotal : row.balanceTotal);
    if (!Number.isFinite(total) || total <= 0) return null;
    return (
      <text
        x={layout.cx}
        y={layout.yTop - 6}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="currentColor"
        fontSize={10}
        fontWeight={600}
        className="tabular-nums text-slate-700 dark:text-slate-200"
      >
        {formatUsd(total, 0)}
      </text>
    );
  };
  return labelFn as LabelContentType;
}

function fcSingleBarTopLabel(chartData: Record<string, string | number>[], totalKey: "depositTotal" | "balanceTotal") {
  const labelFn = (props: Record<string, unknown>) => {
    const layout = fcBarLabelLayout(props);
    const monthIdx = typeof props.index === "number" ? props.index : Number(props.index);
    if (layout == null || !Number.isFinite(monthIdx) || monthIdx < 0 || monthIdx >= chartData.length) return null;
    const total = Number(chartData[monthIdx]?.[totalKey]);
    if (!Number.isFinite(total) || total <= 0) return null;
    return (
      <text
        x={layout.cx}
        y={layout.yTop - 6}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="currentColor"
        fontSize={10}
        fontWeight={600}
        className="tabular-nums text-slate-700 dark:text-slate-200"
      >
        {formatUsd(total, 0)}
      </text>
    );
  };
  return labelFn as LabelContentType;
}

/** Month total label on top of the landed-cost stack (only on the top non-zero segment). */
function lcMonthlyTotalTopLabel(
  chartData: Record<string, string | number>[],
  seriesOrder: string[],
): LabelContentType {
  const labelFn = (props: Record<string, unknown>) => {
    const layout = fcBarLabelLayout(props);
    const monthIdx = typeof props.index === "number" ? props.index : Number(props.index);
    if (layout == null || !Number.isFinite(monthIdx) || monthIdx < 0 || monthIdx >= chartData.length) return null;
    const row = chartData[monthIdx];
    if (!row) return null;
    const total = Number(row.monthTotal);
    if (!Number.isFinite(total) || total <= 0) return null;
    const curKey = String(props.dataKey ?? "");
    let topIdx = -1;
    for (let j = seriesOrder.length - 1; j >= 0; j--) {
      if (Number(row[seriesOrder[j]] ?? 0) > 0) {
        topIdx = j;
        break;
      }
    }
    const selfIdx = seriesOrder.indexOf(curKey);
    if (selfIdx < 0 || selfIdx !== topIdx) return null;
    return (
      <text
        x={layout.cx}
        y={layout.yTop - 6}
        textAnchor="middle"
        dominantBaseline="auto"
        fill="currentColor"
        fontSize={10}
        fontWeight={600}
        className="tabular-nums text-slate-700 dark:text-slate-200"
      >
        {formatUsd(total, 0)}
      </text>
    );
  };
  return labelFn as LabelContentType;
}

function LcPaymentBarTooltip({
  active,
  payload,
  label,
  seriesMeta,
  tipSku,
  tipDest,
  tipTotal,
  tipDue,
  tipMonthTotal,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; name?: string; value?: number; color?: string }[];
  label?: string;
  seriesMeta: Record<string, LandedCostBarSeriesMeta>;
  tipSku: string;
  tipDest: string;
  tipTotal: string;
  tipDue: string;
  tipMonthTotal: string;
}) {
  if (!active || !payload?.length) return null;
  const withVal = payload.filter((p) => {
    const k = String(p.dataKey ?? "");
    return k.startsWith("lc_") && Number(p.value) > 0;
  });
  if (withVal.length === 0) return null;
  const first = payload[0] as { payload?: Record<string, string | number> } | undefined;
  const rowPayload = first?.payload;
  const monthTotal =
    rowPayload && typeof rowPayload.monthTotal === "number" ? rowPayload.monthTotal : null;
  return (
    <div className="max-w-sm rounded-lg border border-app-border bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur dark:bg-slate-900/95">
      <p className="mb-1 font-medium text-[#111827] dark:text-slate-100">{label}</p>
      {monthTotal != null && Number.isFinite(monthTotal) && monthTotal > 0 ? (
        <p className="mb-2 border-b border-app-border/80 pb-2 font-semibold tabular-nums text-slate-800 dark:text-slate-200">
          {tipMonthTotal}: {formatUsd(monthTotal, 2)}
        </p>
      ) : null}
      <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
        {withVal.map((p) => {
          const meta = seriesMeta[String(p.dataKey ?? "")];
          if (!meta) return null;
          return (
            <div key={String(p.dataKey)} className="rounded-md border border-app-border/60 bg-app-surface/50 p-2">
              <p className="font-medium tabular-nums text-[#111827] dark:text-slate-100">
                <span style={{ color: p.color }}>■ </span>
                {formatUsd(Number(p.value), 2)}
              </p>
              <p className="mt-1 text-[11px] text-[#4B5563] dark:text-slate-400">
                {tipSku}: <span className="text-foreground">{meta.sku}</span>
              </p>
              <p className="text-[11px] text-[#4B5563] dark:text-slate-400">
                {tipDest}: <span className="text-foreground">{meta.destinationLabel}</span>
              </p>
              <p className="text-[11px] text-[#4B5563] dark:text-slate-400">
                {tipTotal}: <span className="text-foreground">{formatUsd(meta.totalUsd, 2)}</span>
              </p>
              <p className="text-[11px] text-[#4B5563] dark:text-slate-400">
                {tipDue}:{" "}
                <span className="text-foreground" lang="en">
                  {formatPoIssueDateEnglish(meta.paymentDueYmd)}
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FcPaymentBarTooltip({
  active,
  payload,
  label,
  language,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; name?: string; value?: number; color?: string }[];
  label?: string;
  language: Language;
}) {
  const en = language === "en";
  if (!active || !payload?.length) return null;
  const withVal = payload.filter((p) => Number(p.value) > 0);
  const deposits = withVal.filter((p) => String(p.dataKey ?? "").startsWith("d"));
  const balances = withVal.filter((p) => String(p.dataKey ?? "").startsWith("b"));
  const totals = withVal.filter((p) => p.dataKey === "depositTotal" || p.dataKey === "balanceTotal");
  const rows = deposits.length + balances.length > 0 ? [...deposits, ...balances] : totals;
  if (rows.length === 0) return null;
  return (
    <div className="max-w-xs rounded-lg border border-app-border bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur">
      <p className="mb-1.5 font-medium text-[#111827]">{label}</p>
      {deposits.length > 0 ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
          {en ? "Deposits" : "订金"}
        </p>
      ) : null}
      {deposits.map((p) => (
        <p key={String(p.dataKey)} className="tabular-nums text-[#4B5563]">
          <span style={{ color: p.color }}>{p.name}: </span>
          {formatUsd(Number(p.value), 2)}
        </p>
      ))}
      {balances.length > 0 ? (
        <p className="mb-1 mt-2 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
          {en ? "Balances" : "尾款"}
        </p>
      ) : null}
      {balances.map((p) => (
        <p key={String(p.dataKey)} className="tabular-nums text-[#4B5563]">
          <span style={{ color: p.color }}>{p.name}: </span>
          {formatUsd(Number(p.value), 2)}
        </p>
      ))}
      {deposits.length === 0 && balances.length === 0 && totals.length > 0
        ? totals.map((p) => (
            <p key={String(p.dataKey)} className="tabular-nums text-[#4B5563]">
              <span style={{ color: p.color }}>{p.name}: </span>
              {formatUsd(Number(p.value), 2)}
            </p>
          ))
        : null}
    </div>
  );
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

export function CashFlowDashboard({
  language,
  entries,
  costAnalysisEntries,
  forecastCashFlowRows = [],
  fcSuppliers = [],
  showForecastCashFlowSummary = false,
  onForecastCashFlowSettingsSaved,
  onForecastCashFlowSettingsError,
  forecastSummaryOnly = false,
}: Props) {
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
  const [fcPoSavingId, setFcPoSavingId] = useState<string | null>(null);
  const [fcShippingSavingId, setFcShippingSavingId] = useState<string | null>(null);
  const fcDestinationOptions = useMemo(() => buildForecastDestinationOptions(), []);

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

  const supplierTermsByName = useMemo(() => {
    const m = new Map<string, { paymentTerms: string; leadTimeDays: number }>();
    for (const s of fcSuppliers) {
      const k = s.name.trim().toLowerCase();
      if (!k) continue;
      m.set(k, { paymentTerms: s.paymentTerms || "", leadTimeDays: s.leadTimeDays ?? 0 });
    }
    return m;
  }, [fcSuppliers]);

  const fcDashboardRows = useMemo(() => {
    return forecastCashFlowRows.map((row) => {
      const lineTotal = forecastLineTotalUsd(row);
      const supplierLabel = row.cashFlowSupplierName.trim() || "—";
      const nameKey = row.cashFlowSupplierName.trim().toLowerCase();
      const supMeta = nameKey ? supplierTermsByName.get(nameKey) : undefined;

      let schedule: ForecastPaySchedule | null = null;
      if (
        lineTotal != null &&
        row.poIssueDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(row.poIssueDate) &&
        nameKey &&
        supMeta
      ) {
        schedule = computeForecastPaymentSchedule({
          lineTotalUsd: lineTotal,
          poIssueDate: row.poIssueDate,
          leadTimeDays: supMeta.leadTimeDays,
          paymentTerms: supMeta.paymentTerms,
        });
      }

      return {
        row,
        lineTotal,
        supplierLabel,
        schedule,
        supMeta,
        unknownSupplier: Boolean(nameKey && !supMeta),
      };
    });
  }, [forecastCashFlowRows, supplierTermsByName]);

  const fcSumComputable = useMemo(
    () => fcDashboardRows.reduce((s, x) => s + (x.lineTotal ?? 0), 0),
    [fcDashboardRows],
  );

  const fcSumDeposits = useMemo(
    () =>
      fcDashboardRows.reduce((s, x) => {
        const sch = x.schedule;
        if (!sch || sch.parseFailed) return s;
        return s + (sch.deposit?.amountUsd ?? 0);
      }, 0),
    [fcDashboardRows],
  );

  const fcSumBalances = useMemo(
    () =>
      fcDashboardRows.reduce((s, x) => {
        const sch = x.schedule;
        if (!sch || sch.parseFailed) return s;
        return s + (sch.balance?.amountUsd ?? 0);
      }, 0),
    [fcDashboardRows],
  );

  const fcPaymentBar = useMemo(() => {
    const monthKeys = paymentMonthWindowAroundToday(6, 6);
    const monthLabelFn = (mk: string) => {
      const [y, m] = mk.split("-").map(Number);
      if (language === "en") {
        return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      }
      return `${y}年${m}月`;
    };
    const inputs = fcDashboardRows.map(({ row, lineTotal, schedule }) => ({ row, lineTotal, schedule }));
    return buildForecastCashPaymentBarData(inputs, monthKeys, monthLabelFn);
  }, [fcDashboardRows, language]);

  const fcBarHasAnyAmount = useMemo(
    () => fcPaymentBar.chartData.some((r) => Number(r.depositTotal) > 0 || Number(r.balanceTotal) > 0),
    [fcPaymentBar.chartData],
  );

  const lcPaymentBar = useMemo(() => {
    const monthKeys = paymentMonthWindowAroundToday(6, 6);
    const monthLabelFn = (mk: string) => {
      const [y, m] = mk.split("-").map(Number);
      if (language === "en") {
        return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      }
      return `${y}年${m}月`;
    };
    const rowInputs = buildLandedCostBarRowInputs(forecastCashFlowRows, language, fcDestinationOptions);
    return buildLandedCostPaymentBarData(rowInputs, monthKeys, monthLabelFn);
  }, [forecastCashFlowRows, language, fcDestinationOptions]);

  const lcBarHasAnyAmount = useMemo(
    () => lcPaymentBar.chartData.some((r) => Number(r.monthTotal) > 0),
    [lcPaymentBar.chartData],
  );

  /** Landed cost table footer: Σ Total amount (USD) for rows where landed × qty is computable. */
  const lcTableSums = useMemo(() => {
    let sumTotalUsd = 0;
    let computableLines = 0;
    for (const row of forecastCashFlowRows) {
      const q = row.latestUnitCostQuote;
      const mfr = (q?.manufacturerCountry ?? "").trim();
      const landed = computeLandedCostPerUnitUsd({
        forecastIncoterm: row.incoterm,
        shippingMode: row.cashFlowShippingMode,
        unitPriceUsd: row.unitPriceUsd,
        destinationTariffPct: q?.destinationTariffPct ?? null,
        seaFreightUsd: q?.seaFreightUnitPrice ?? null,
        airFreightUsd: q?.airFreightUnitPrice ?? null,
      });
      const qty = Number(row.buildToOrder) + Number(row.buildToStock);
      const totalUsd =
        landed != null && Number.isFinite(qty) && qty > 0 ? landed * qty : null;
      if (totalUsd != null && Number.isFinite(totalUsd)) {
        sumTotalUsd += totalUsd;
        computableLines += 1;
      }
    }
    return { sumTotalUsd, computableLines };
  }, [forecastCashFlowRows]);

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

  const persistFcPoIssueDate = useCallback(
    async (forecastId: string, isoDay: string) => {
      setFcPoSavingId(forecastId);
      const res = await fetch("/api/cost-control/forecast-cash-flow", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forecastId, poIssueDate: isoDay || null }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        supplierName?: string;
        unitPriceUsd?: number | null;
        poIssueDate?: string | null;
        shippingMode?: ForecastCashFlowRow["cashFlowShippingMode"];
        latestUnitCostQuote?: UnitCostQuoteEntry | null;
      };
      setFcPoSavingId(null);
      if (!res.ok) {
        onForecastCashFlowSettingsError?.(
          data.message ||
            (language === "en" ? "Could not save PO issue date." : "保存订单下达日期失败。"),
        );
        return;
      }
      onForecastCashFlowSettingsSaved?.(forecastId, {
        supplierName: String(data.supplierName ?? ""),
        unitPriceUsd: data.unitPriceUsd ?? null,
        poIssueDate: data.poIssueDate ?? null,
        shippingMode: data.shippingMode === "air" ? "air" : "ocean",
        latestUnitCostQuote: data.latestUnitCostQuote ?? null,
      });
    },
    [language, onForecastCashFlowSettingsError, onForecastCashFlowSettingsSaved],
  );

  const persistFcShippingMode = useCallback(
    async (forecastId: string, mode: ForecastCashFlowRow["cashFlowShippingMode"]) => {
      setFcShippingSavingId(forecastId);
      const res = await fetch("/api/cost-control/forecast-cash-flow", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forecastId, shippingMode: mode }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        supplierName?: string;
        unitPriceUsd?: number | null;
        poIssueDate?: string | null;
        shippingMode?: ForecastCashFlowRow["cashFlowShippingMode"];
        latestUnitCostQuote?: UnitCostQuoteEntry | null;
      };
      setFcShippingSavingId(null);
      if (!res.ok) {
        onForecastCashFlowSettingsError?.(
          data.message || (language === "en" ? "Could not save shipping mode." : "保存运输方式失败。"),
        );
        return;
      }
      onForecastCashFlowSettingsSaved?.(forecastId, {
        supplierName: String(data.supplierName ?? ""),
        unitPriceUsd: data.unitPriceUsd ?? null,
        poIssueDate: data.poIssueDate ?? null,
        shippingMode: data.shippingMode === "air" ? "air" : "ocean",
        latestUnitCostQuote: data.latestUnitCostQuote ?? null,
      });
    },
    [language, onForecastCashFlowSettingsError, onForecastCashFlowSettingsSaved],
  );

  const renderForecastCashFlowSummary = () => {
    if (!showForecastCashFlowSummary) return null;
    return (
      <div className="app-card p-4">
          <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.fcSummaryTitle}</h5>
          <p className="mt-1 text-xs text-[#9CA3AF]">{t.fcSummaryHint}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  <th className="py-2 pr-3">{t.fcColSupplier}</th>
                  <th className="py-2 pr-3">{t.fcColSku}</th>
                  <th className="py-2 pr-3 text-right tabular-nums">{t.fcColBto}</th>
                  <th className="py-2 pr-3 text-right tabular-nums">{t.fcColBts}</th>
                  <th
                    className="min-w-[10rem] py-2 pr-3"
                    title={
                      language === "en"
                        ? "Order date in English; use the picker to change."
                        : "订单日期以英文展示，可用日期选择器修改。"
                    }
                  >
                    {t.fcColPoIssue}
                  </th>
                  <th className="py-2 pr-3 text-right">{t.fcColTotal}</th>
                  <th
                    className="min-w-[7.5rem] py-2 pr-3"
                    title={
                      language === "en"
                        ? "From supplier Payment terms: deposit % on PO date."
                        : "来自供应商付款条款：订金比例在 PO 日支付。"
                    }
                  >
                    {t.fcColDeposit}
                  </th>
                  <th
                    className="min-w-[7.5rem] py-2 pr-3"
                    title={
                      language === "en"
                        ? "Balance % on PO date + Lead time + Net days (from supplier master)."
                        : "尾款在 PO + Lead time + 条款中 Net 天（自然日）。"
                    }
                  >
                    {t.fcColBalance}
                  </th>
                </tr>
              </thead>
              <tbody>
                {fcDashboardRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      {t.fcNoRows}
                    </td>
                  </tr>
                ) : (
                  fcDashboardRows.map(({ row, lineTotal, supplierLabel, schedule, unknownSupplier, supMeta }) => (
                    <tr key={row.id} className="border-b border-app-border/60">
                      <td className="max-w-[12rem] truncate py-2 pr-3">{supplierLabel}</td>
                      <td className="py-2 pr-3 font-medium">{row.sku}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.buildToOrder}</td>
                      <td className="py-2 pr-3 text-right tabular-nums">{row.buildToStock}</td>
                      <td className="py-2 pr-3 align-top" lang="en">
                        <div className="flex min-w-[9rem] flex-col gap-1">
                          <span className="whitespace-nowrap tabular-nums text-xs font-medium text-slate-800 dark:text-slate-100">
                            {row.poIssueDate ? formatPoIssueDateEnglish(row.poIssueDate) : "—"}
                          </span>
                          <input
                            type="date"
                            value={row.poIssueDate ?? ""}
                            onChange={(e) => void persistFcPoIssueDate(row.id, e.target.value)}
                            disabled={fcPoSavingId === row.id}
                            className="w-full max-w-[11rem] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                            aria-label={t.fcColPoIssue}
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {lineTotal != null ? formatUsd(lineTotal, 2) : t.na}
                      </td>
                      <td className="min-w-[7.5rem] py-2 pr-3 align-top">
                        {lineTotal == null || !row.poIssueDate || !row.cashFlowSupplierName.trim() ? (
                          <span className="text-slate-400" title={t.fcPayNeedPoAndTotal}>
                            {t.na}
                          </span>
                        ) : unknownSupplier ? (
                          <span className="text-slate-400" title={t.fcPayUnknownSupplier}>
                            {t.na}
                          </span>
                        ) : schedule?.parseFailed ? (
                          <span
                            className="cursor-help text-slate-400"
                            title={`${t.fcPayParseTerms}\n${supMeta?.paymentTerms ?? ""}`}
                          >
                            {t.na}
                          </span>
                        ) : schedule?.deposit ? (
                          <div className="flex flex-col gap-0.5 text-xs" lang="en">
                            <span className="whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">
                              {formatScheduleDateEnglish(schedule.deposit.dateYmd)}
                            </span>
                            <span className="tabular-nums text-slate-700 dark:text-slate-200">
                              {formatUsd(schedule.deposit.amountUsd, 2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">{t.na}</span>
                        )}
                      </td>
                      <td className="min-w-[7.5rem] py-2 pr-3 align-top">
                        {lineTotal == null || !row.poIssueDate || !row.cashFlowSupplierName.trim() ? (
                          <span className="text-slate-400" title={t.fcPayNeedPoAndTotal}>
                            {t.na}
                          </span>
                        ) : unknownSupplier ? (
                          <span className="text-slate-400" title={t.fcPayUnknownSupplier}>
                            {t.na}
                          </span>
                        ) : schedule?.parseFailed ? (
                          <span
                            className="cursor-help text-slate-400"
                            title={`${t.fcPayParseTerms}\n${supMeta?.paymentTerms ?? ""}`}
                          >
                            {t.na}
                          </span>
                        ) : schedule?.balance ? (
                          <div className="flex flex-col gap-0.5 text-xs" lang="en">
                            <span className="whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">
                              {formatScheduleDateEnglish(schedule.balance.dateYmd)}
                            </span>
                            <span className="tabular-nums text-slate-700 dark:text-slate-200">
                              {formatUsd(schedule.balance.amountUsd, 2)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">{t.na}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {fcDashboardRows.length > 0 ? (
                <tfoot>
                  <tr className="border-t border-slate-200 dark:border-slate-600">
                    {fcSumComputable > 0 ? (
                      <>
                        <td className="py-2 pr-3 font-medium text-slate-600 dark:text-slate-300" colSpan={5}>
                          {t.fcSumLabel}
                        </td>
                        <td className="py-2 pr-3 text-right text-base font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
                          {formatUsd(fcSumComputable, 2)}
                        </td>
                        <td className="py-2 pr-3 text-right text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">
                          {fcSumDeposits > 0 ? (
                            <span title={t.fcSumDeposits}>{formatUsd(fcSumDeposits, 2)}</span>
                          ) : (
                            <span className="text-slate-400">{t.na}</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200">
                          {fcSumBalances > 0 ? (
                            <span title={t.fcSumBalances}>{formatUsd(fcSumBalances, 2)}</span>
                          ) : (
                            <span className="text-slate-400">{t.na}</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <td colSpan={8} className="py-3 text-center text-xs text-slate-400">
                        {t.fcEmpty}
                      </td>
                    )}
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          <div className="mt-6 border-t border-slate-200/80 pt-4 dark:border-slate-700">
            <h6 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.fcBarTitle}</h6>
            <p className="mt-1 text-xs text-[#9CA3AF]">{t.fcBarHint}</p>
            <div className="mt-3 h-80 w-full min-w-0">
              {!fcBarHasAnyAmount ? (
                <p className="py-16 text-center text-sm text-slate-400">{t.fcBarNoData}</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={fcPaymentBar.chartData}
                    margin={{ top: 40, right: 12, left: 4, bottom: 28 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-32} textAnchor="end" height={70} stroke="#64748b" />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      stroke="#64748b"
                      tickFormatter={(v) => formatUsd(Number(v), 0)}
                      width={56}
                    />
                    <Tooltip content={<FcPaymentBarTooltip language={language} />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {fcPaymentBar.suppliers.length === 0 ? (
                      <>
                        <Bar
                          dataKey="depositTotal"
                          name={t.fcBarDeposit}
                          fill={FC_DEP_STACK[0]}
                          isAnimationActive={false}
                        >
                          <LabelList content={fcSingleBarTopLabel(fcPaymentBar.chartData, "depositTotal")} />
                        </Bar>
                        <Bar
                          dataKey="balanceTotal"
                          name={t.fcBarBalance}
                          fill={FC_BAL_STACK[0]}
                          isAnimationActive={false}
                        >
                          <LabelList content={fcSingleBarTopLabel(fcPaymentBar.chartData, "balanceTotal")} />
                        </Bar>
                      </>
                    ) : (
                      <>
                        {fcPaymentBar.suppliers.map((s, i) => (
                          <Bar
                            key={`fc-dep-${s}-${i}`}
                            stackId="fcDep"
                            dataKey={`d${i}`}
                            name={language === "en" ? `${s} · deposit` : `${s} · 订金`}
                            fill={FC_DEP_STACK[i % FC_DEP_STACK.length]}
                            isAnimationActive={false}
                          >
                            <LabelList
                              content={fcStackSumLabelContent("deposit", i, fcPaymentBar.suppliers.length, fcPaymentBar.chartData)}
                            />
                          </Bar>
                        ))}
                        {fcPaymentBar.suppliers.map((s, i) => (
                          <Bar
                            key={`fc-bal-${s}-${i}`}
                            stackId="fcBal"
                            dataKey={`b${i}`}
                            name={language === "en" ? `${s} · balance` : `${s} · 尾款`}
                            fill={FC_BAL_STACK[i % FC_BAL_STACK.length]}
                            isAnimationActive={false}
                          >
                            <LabelList
                              content={fcStackSumLabelContent("balance", i, fcPaymentBar.suppliers.length, fcPaymentBar.chartData)}
                            />
                          </Bar>
                        ))}
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="mt-6 border-t border-slate-200/80 pt-4 dark:border-slate-700">
            <h6 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.lcTitle}</h6>
            <p className="mt-1 text-xs text-[#9CA3AF]">{t.lcHint}</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[2200px] border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColMonth}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColForecastNo}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColRegion}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColDestination}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColSupplier}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColMfr}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColSku}</th>
                    <th className="whitespace-nowrap py-2 pr-2 text-right">{t.lcColBto}</th>
                    <th className="whitespace-nowrap py-2 pr-2 text-right">{t.lcColBts}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColCreated}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColPoIssue}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColIncoterm}</th>
                    <th className="min-w-[11rem] whitespace-nowrap py-2 pr-2">{t.lcColShip}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColDepart}</th>
                    <th className="whitespace-nowrap py-2 pr-2 text-right">{t.lcColLanded}</th>
                    <th className="whitespace-nowrap py-2 pr-2 text-right">{t.lcColTotal}</th>
                    <th className="whitespace-nowrap py-2 pr-2">{t.lcColPayDue}</th>
                    <th className="min-w-[10rem] py-2 pr-2">{t.lcColComment}</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastCashFlowRows.length === 0 ? (
                    <tr>
                      <td colSpan={18} className="py-8 text-center text-slate-400">
                        {t.lcNoRows}
                      </td>
                    </tr>
                  ) : (
                    forecastCashFlowRows.map((row) => {
                      const q = row.latestUnitCostQuote;
                      const mfr = (q?.manufacturerCountry ?? "").trim();
                      const landed = computeLandedCostPerUnitUsd({
                        forecastIncoterm: row.incoterm,
                        shippingMode: row.cashFlowShippingMode,
                        unitPriceUsd: row.unitPriceUsd,
                        destinationTariffPct: q?.destinationTariffPct ?? null,
                        seaFreightUsd: q?.seaFreightUnitPrice ?? null,
                        airFreightUsd: q?.airFreightUnitPrice ?? null,
                      });
                      const qty = Number(row.buildToOrder) + Number(row.buildToStock);
                      const totalUsd =
                        landed != null && Number.isFinite(qty) && qty > 0 ? landed * qty : null;
                      const depYmd = computeDepartureDateYmd(row.poIssueDate, mfr, row.cashFlowShippingMode);
                      const payYmd = computePaymentDueYmd(depYmd);
                      return (
                        <tr key={`lc-${row.id}`} className="border-b border-app-border/60">
                          <td className="whitespace-nowrap py-2 pr-2">
                            {formatForecastMonthCell(row.month, language)}
                          </td>
                          <td className="py-2 pr-2">{row.poNumber || t.na}</td>
                          <td className="py-2 pr-2">{row.region}</td>
                          <td className="max-w-[10rem] break-words py-2 pr-2">
                            {forecastDestinationDisplay(row.destination, language, fcDestinationOptions)}
                          </td>
                          <td className="max-w-[10rem] truncate py-2 pr-2">
                            {row.cashFlowSupplierName.trim() || t.na}
                          </td>
                          <td className="max-w-[8rem] truncate py-2 pr-2">{mfr || t.na}</td>
                          <td className="py-2 pr-2 font-medium">{row.sku}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{row.buildToOrder}</td>
                          <td className="py-2 pr-2 text-right tabular-nums">{row.buildToStock}</td>
                          <td className="whitespace-nowrap py-2 pr-2 tabular-nums">
                            {row.createdAt.slice(0, 10)}
                          </td>
                          <td className="whitespace-nowrap py-2 pr-2" lang="en">
                            {row.poIssueDate ? formatPoIssueDateEnglish(row.poIssueDate) : t.na}
                          </td>
                          <td className="py-2 pr-2 font-medium">{row.incoterm}</td>
                          <td className="py-2 pr-2 align-top">
                            <select
                              value={row.cashFlowShippingMode}
                              onChange={(e) =>
                                void persistFcShippingMode(
                                  row.id,
                                  e.target.value as ForecastCashFlowRow["cashFlowShippingMode"],
                                )
                              }
                              disabled={fcShippingSavingId === row.id}
                              className="w-full max-w-[13rem] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                              aria-label={t.lcColShip}
                            >
                              <option value="ocean">{t.lcShipOcean}</option>
                              <option value="air">{t.lcShipAir}</option>
                            </select>
                          </td>
                          <td className="whitespace-nowrap py-2 pr-2" lang="en">
                            {depYmd ? formatPoIssueDateEnglish(depYmd) : t.na}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {landed != null ? formatUsd(landed, 4) : t.na}
                          </td>
                          <td className="py-2 pr-2 text-right tabular-nums">
                            {totalUsd != null ? formatUsd(totalUsd, 2) : t.na}
                          </td>
                          <td className="whitespace-nowrap py-2 pr-2" lang="en">
                            {payYmd ? formatPoIssueDateEnglish(payYmd) : t.na}
                          </td>
                          <td className="max-w-[14rem] break-words py-2 pr-2 text-slate-600 dark:text-slate-300">
                            {row.remark?.trim() ? row.remark : t.na}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                {forecastCashFlowRows.length > 0 ? (
                  <tfoot>
                    <tr className="border-t border-slate-200 bg-slate-50/90 dark:border-slate-600 dark:bg-slate-800/60">
                      <td
                        colSpan={15}
                        className="py-2.5 pr-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300"
                      >
                        {t.lcSumLabel}
                      </td>
                      <td className="py-2.5 pr-2 text-right text-sm font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                        {lcTableSums.sumTotalUsd > 0 ? formatUsd(lcTableSums.sumTotalUsd, 2) : <span className="text-slate-400">{t.na}</span>}
                      </td>
                      <td
                        colSpan={2}
                        className="py-2.5 pr-2 text-left text-[11px] text-slate-500 dark:text-slate-400"
                        title={t.lcSumLineCount}
                      >
                        {lcTableSums.computableLines} / {forecastCashFlowRows.length}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>

            <div className="mt-6 border-t border-slate-200/80 pt-4 dark:border-slate-700">
              <h6 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.lcBarTitle}</h6>
              <p className="mt-1 text-xs text-[#9CA3AF]">{t.lcBarHint}</p>
              {lcPaymentBar.seriesOrder.length > 12 ? (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{t.lcBarLegendHint}</p>
              ) : null}
              <div className="mt-3 h-80 w-full min-w-0">
                {!lcBarHasAnyAmount ? (
                  <p className="py-16 text-center text-sm text-slate-400">{t.lcBarNoData}</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={lcPaymentBar.chartData}
                      margin={{ top: 44, right: 12, left: 4, bottom: 28 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10 }}
                        interval={0}
                        angle={-32}
                        textAnchor="end"
                        height={70}
                        stroke="#64748b"
                      />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        stroke="#64748b"
                        tickFormatter={(v) => formatUsd(Number(v), 0)}
                        width={56}
                      />
                      <Tooltip
                        content={
                          <LcPaymentBarTooltip
                            seriesMeta={lcPaymentBar.seriesMeta}
                            tipSku={t.lcTipSku}
                            tipDest={t.lcTipDest}
                            tipTotal={t.lcTipTotal}
                            tipDue={t.lcTipDue}
                            tipMonthTotal={t.lcTipMonthTotal}
                          />
                        }
                      />
                      {lcPaymentBar.seriesOrder.length > 0 && lcPaymentBar.seriesOrder.length <= 12 ? (
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                      ) : null}
                      {lcPaymentBar.seriesOrder.map((stackKey, i) => {
                        const meta = lcPaymentBar.seriesMeta[stackKey];
                        const legendName = meta
                          ? `${meta.sku} · ${
                              meta.destinationLabel.length > 28
                                ? `${meta.destinationLabel.slice(0, 28)}…`
                                : meta.destinationLabel
                            }`
                          : stackKey;
                        return (
                          <Bar
                            key={stackKey}
                            stackId="lcPay"
                            dataKey={stackKey}
                            name={legendName}
                            fill={LC_PAY_STACK[i % LC_PAY_STACK.length]}
                            isAnimationActive={false}
                          >
                            <LabelList
                              content={lcMonthlyTotalTopLabel(lcPaymentBar.chartData, lcPaymentBar.seriesOrder)}
                            />
                          </Bar>
                        );
                      })}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
    );
  };

  if (forecastSummaryOnly) {
    return <div className="mb-10 space-y-6">{renderForecastCashFlowSummary()}</div>;
  }

  return (
    <div className="mb-10 space-y-6">
      {renderForecastCashFlowSummary()}

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
