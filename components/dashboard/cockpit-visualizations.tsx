"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";

import { CashFlowDashboard } from "@/components/cost-control/cash-flow-dashboard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ForecastExecutiveOverview } from "@/components/dashboard/forecast-executive-overview";
import {
  aggregateLogisticsQuarters,
  aggregateOrderQuarters,
  buildLogisticsMonthlySeries,
  buildOrderMonthlySeries,
  drillLogisticsForMonth,
  drillLogisticsForQuarter,
  drillOrdersForMonth,
  drillOrdersForQuarterOp,
  filterLogistics,
  filterLogisticsByDateRange,
  filterOrderByDateRange,
  filterOrderProgress,
  logisticsKpis,
  orderKpis,
} from "@/lib/cockpit-dashboard-agg";
import { getDateRangePreset, monthKeysBetween, type RangePreset } from "@/lib/cash-flow-dashboard-agg";
import { formatSamePageSnapshotCrossRef } from "@/lib/format-data-snapshot";
import type { Language } from "@/lib/i18n";
import type {
  ForecastCashFlowRow,
  ForecastEntry,
  LogisticsShipmentEntry,
  OrderProgressEntry,
  OrderProgressRegion,
  SupplierEntry,
  UnitCostQuoteEntry,
} from "@/lib/types";

const COLORS = {
  blue: "#2563eb",
  emerald: "#059669",
  indigo: "#4f46e5",
  amber: "#d97706",
  violet: "#7c3aed",
  rose: "#e11d48",
};

type Props = {
  language: Language;
  /** ISO instant from the server; must match the dashboard header “as of” line. */
  dataSnapshotAt?: string;
  forecasts: ForecastEntry[];
  orderProgress: OrderProgressEntry[];
  logistics: LogisticsShipmentEntry[];
  forecastCashFlowRows: ForecastCashFlowRow[];
  fcSuppliers: SupplierEntry[];
  unitCostQuotes: UnitCostQuoteEntry[];
  forecastExport?: { href: string; label: string };
};

function formatNum(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function Tx({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-app-border bg-white/95 px-3 py-2 text-xs shadow-[0_8px_24px_rgba(17,24,39,0.08)]">
      <p className="mb-1 font-medium text-[#111827]">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="tabular-nums text-[#4B5563]">
          <span style={{ color: p.color }}>{p.name}: </span>
          {formatNum(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

type Grain = "month" | "quarter";
type DrillState =
  | { module: "order"; label: string; rows: OrderProgressEntry[] }
  | { module: "logistics"; label: string; rows: LogisticsShipmentEntry[] }
  | null;

export function CockpitVisualizations({
  language,
  dataSnapshotAt,
  forecasts,
  orderProgress,
  logistics,
  forecastCashFlowRows,
  fcSuppliers,
  unitCostQuotes,
  forecastExport,
}: Props) {
  const en = language === "en";

  const sameSnapshotCrossRef = useMemo(() => {
    if (!dataSnapshotAt) return null;
    return formatSamePageSnapshotCrossRef(dataSnapshotAt, language);
  }, [dataSnapshotAt, language]);

  const [oPreset, setOPreset] = useState<RangePreset>("pm3");
  const [oFrom, setOFrom] = useState("");
  const [oTo, setOTo] = useState("");
  const [oRegion, setORegion] = useState("");
  const [oFactory, setOFactory] = useState("");
  const [oProgress, setOProgress] = useState("");
  const [oGrain, setOGrain] = useState<Grain>("month");

  const [lPreset, setLPreset] = useState<RangePreset>("pm3");
  const [lFrom, setLFrom] = useState("");
  const [lTo, setLTo] = useState("");
  const [lStatus, setLStatus] = useState("");
  const [lMove, setLMove] = useState("");
  const [lFromLoc, setLFromLoc] = useState("");
  const [lToLoc, setLToLoc] = useState("");
  const [lGrain, setLGrain] = useState<Grain>("month");

  const [drill, setDrill] = useState<DrillState>(null);

  const oDateRange = useMemo(() => getDateRangePreset(oPreset, oFrom, oTo), [oPreset, oFrom, oTo]);
  const oFiltered = useMemo(() => {
    const dims = filterOrderProgress(orderProgress, {
      region: oRegion,
      factory: oFactory,
      progress: oProgress,
    });
    return filterOrderByDateRange(dims, oDateRange.from, oDateRange.to);
  }, [orderProgress, oRegion, oFactory, oProgress, oDateRange]);
  const oKpi = useMemo(() => orderKpis(oFiltered), [oFiltered]);
  const oChart = useMemo(() => {
    const keys = monthKeysBetween(oDateRange.from, oDateRange.to);
    const m = buildOrderMonthlySeries(oFiltered, keys);
    return oGrain === "month" ? m : aggregateOrderQuarters(m);
  }, [oFiltered, oDateRange, oGrain]);

  const lDateRange = useMemo(() => getDateRangePreset(lPreset, lFrom, lTo), [lPreset, lFrom, lTo]);
  const lFiltered = useMemo(() => {
    const dims = filterLogistics(logistics, {
      status: lStatus,
      movementType: lMove,
      fromLocation: lFromLoc,
      toLocation: lToLoc,
    });
    return filterLogisticsByDateRange(dims, lDateRange.from, lDateRange.to);
  }, [logistics, lStatus, lMove, lFromLoc, lToLoc, lDateRange]);
  const lKpi = useMemo(() => logisticsKpis(lFiltered), [lFiltered]);
  const lChart = useMemo(() => {
    const keys = monthKeysBetween(lDateRange.from, lDateRange.to);
    const m = buildLogisticsMonthlySeries(lFiltered, keys);
    return lGrain === "month" ? m : aggregateLogisticsQuarters(m);
  }, [lFiltered, lDateRange, lGrain]);

  const orderFactories = useMemo(
    () => [...new Set(orderProgress.map((e) => e.factoryName).filter(Boolean))].sort(),
    [orderProgress],
  );
  const orderRegions = useMemo(
    () => [...new Set(orderProgress.map((e) => e.region))].sort() as OrderProgressRegion[],
    [orderProgress],
  );

  const logFromLocs = useMemo(
    () => [...new Set(logistics.map((e) => e.fromLocation))].sort(),
    [logistics],
  );
  const logToLocs = useMemo(
    () => [...new Set(logistics.map((e) => e.toLocation))].sort(),
    [logistics],
  );

  const openOrderDrill = useCallback(
    (key: string) => {
      const rows = oGrain === "month" ? drillOrdersForMonth(oFiltered, key) : drillOrdersForQuarterOp(oFiltered, key);
      setDrill({ module: "order", label: key, rows });
    },
    [oFiltered, oGrain],
  );
  const openLogDrill = useCallback(
    (key: string) => {
      const rows = lGrain === "month" ? drillLogisticsForMonth(lFiltered, key) : drillLogisticsForQuarter(lFiltered, key);
      setDrill({ module: "logistics", label: key, rows });
    },
    [lFiltered, lGrain],
  );

  const chartDataO = oChart.map((p) => ({ ...p, name: p.label }));
  const chartDataL = lChart.map((p) => ({ ...p, name: p.label }));

  const chartClickOrder = (key: string | undefined) => {
    if (key) openOrderDrill(key);
  };
  const chartClickLog = (key: string | undefined) => {
    if (key) openLogDrill(key);
  };

  return (
    <div className="space-y-10">
      <ForecastExecutiveOverview
        language={language}
        dataSnapshotAt={dataSnapshotAt}
        forecasts={forecasts}
        forecastExport={forecastExport}
      />

      {/* Forecast cash flow analysis (scheduled payment chart; full module under Supply Chain → Cost control) */}
      <section className="app-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#111827]">
              {en ? "Forecast Cash flow analysis" : "Forecast 现金流分析"}
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-[#4B5563]">
              {en
                ? "Scheduled deposit & balance payments by due month (same logic as Supply Chain → Cost control). Landed-cost sections are available in that module."
                : "按应付月的订金与尾款（与「供应链管理 → 成本控制 → 现金流分析」一致）。到岸成本相关图表请在成本控制中查看。"}
            </p>
            {sameSnapshotCrossRef ? (
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#9CA3AF]">{sameSnapshotCrossRef}</p>
            ) : null}
          </div>
          <Link
            href="/supply-chain/cost-control?tab=cashflow"
            className="app-button-secondary shrink-0 px-3 py-2 text-sm font-medium"
          >
            {en ? "Open Forecast cash flow analysis" : "打开 Forecast 现金流分析"}
          </Link>
        </div>
        <CashFlowDashboard
          language={language}
          entries={[]}
          costAnalysisEntries={[]}
          forecastCashFlowRows={forecastCashFlowRows}
          fcSuppliers={fcSuppliers}
          unitCostQuotes={unitCostQuotes}
          showForecastCashFlowSummary
          forecastSummaryOnly
          dashboardChartsOnly
        />
      </section>

      {/* Order progress */}
      <section className="app-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#111827]">
              {en ? "Order progress" : "订单进度"}
            </h3>
            <p className="mt-1 text-sm text-[#4B5563]">
              {en
                ? "By order date — default range is current month ±3 months; click chart to drill down."
                : "按下单日 — 默认区间为当前月前后各 3 个自然月；点击图表下钻。"}
            </p>
            {sameSnapshotCrossRef ? (
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#9CA3AF]">{sameSnapshotCrossRef}</p>
            ) : null}
          </div>
          <Link
            href="/order-progress"
            className="app-button-secondary px-3 py-2 text-sm font-medium"
          >
            {en ? "Open module" : "进入模块"}
          </Link>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            {en ? "Range" : "区间"}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={oPreset}
              onChange={(e) => setOPreset(e.target.value as RangePreset)}
            >
              <option value="pm3">{en ? "Current month ±3 months" : "当前月 ±3 个月"}</option>
              <option value="12m">{en ? "Last 12 months" : "近 12 个月"}</option>
              <option value="ytd">{en ? "YTD" : "本年"}</option>
              <option value="custom">{en ? "Custom" : "自定义"}</option>
            </select>
          </label>
          {oPreset === "custom" ? (
            <>
              <label className="min-w-0 text-xs font-medium text-[#4B5563]">
                {en ? "From" : "从"}
                <input
                  type="date"
                  className="mt-1 w-full bg-white px-3 py-2 text-sm"
                  value={oFrom}
                  onChange={(e) => setOFrom(e.target.value)}
                />
              </label>
              <label className="min-w-0 text-xs font-medium text-[#4B5563]">
                {en ? "To" : "至"}
                <input
                  type="date"
                  className="mt-1 w-full bg-white px-3 py-2 text-sm"
                  value={oTo}
                  onChange={(e) => setOTo(e.target.value)}
                />
              </label>
            </>
          ) : (
            <p className="text-xs text-slate-500 sm:col-span-2 md:col-span-3 xl:col-span-2 dark:text-slate-400">
              {oDateRange.from} → {oDateRange.to}
            </p>
          )}
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            {en ? "Granularity" : "粒度"}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={oGrain}
              onChange={(e) => setOGrain(e.target.value as Grain)}
            >
              <option value="month">{en ? "Month" : "月"}</option>
              <option value="quarter">{en ? "Quarter" : "季"}</option>
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            {en ? "Region" : "区域"}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={oRegion}
              onChange={(e) => setORegion(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              {orderRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            {en ? "Factory" : "工厂"}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={oFactory}
              onChange={(e) => setOFactory(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              {orderFactories.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            {en ? "Progress" : "进度"}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={oProgress}
              onChange={(e) => setOProgress(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              <option value="not_started">not_started / {en ? "未开始" : "未开始"}</option>
              <option value="in_production">in_production / {en ? "生产中" : "生产中"}</option>
              <option value="ready_to_ship">ready_to_ship / {en ? "待发货" : "待发货"}</option>
            </select>
          </label>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="app-card min-w-0 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{en ? "Orders" : "订单行数"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(oKpi.total)}</p>
          </article>
          <article className="app-card min-w-0 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{en ? "Qty" : "数量"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(oKpi.qty)}</p>
          </article>
          <article className="app-card min-w-0 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{en ? "In production" : "生产中"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(oKpi.in_production)}</p>
          </article>
          <article className="app-card min-w-0 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{en ? "Ready to ship" : "待发货"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(oKpi.ready_to_ship)}</p>
          </article>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="app-card min-w-0 h-72 p-2">
            {chartDataO.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartDataO}
                  onClick={(s) =>
                    chartClickOrder(s && typeof s === "object" && "activeLabel" in s ? String(s.activeLabel) : undefined)
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<Tx />} />
                  <Legend />
                  <Line type="monotone" dataKey="count" name={en ? "Orders" : "订单数"} stroke={COLORS.indigo} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-[#9CA3AF]">—</p>
            )}
          </div>
          <div className="app-card min-w-0 h-72 p-2">
            {chartDataO.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataO}
                  onClick={(s) =>
                    chartClickOrder(s && typeof s === "object" && "activeLabel" in s ? String(s.activeLabel) : undefined)
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<Tx />} />
                  <Legend />
                  <Bar dataKey="not_started" name="not_started" stackId="a" fill={COLORS.violet} />
                  <Bar dataKey="in_production" name="in_production" stackId="a" fill={COLORS.amber} />
                  <Bar dataKey="ready_to_ship" name="ready_to_ship" stackId="a" fill={COLORS.emerald} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-[#9CA3AF]">—</p>
            )}
          </div>
        </div>
      </section>

      {/* Logistics */}
      <section className="app-card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#111827]">
              {en ? "Logistics progress" : "物流进度"}
            </h3>
            <p className="mt-1 text-sm text-[#4B5563]">
              {en
                ? "By shipment create date — default range is current month ±3 months; click chart to drill down."
                : "按物流记录创建时间 — 默认区间为当前月前后各 3 个自然月；点击图表下钻。"}
            </p>
            {sameSnapshotCrossRef ? (
              <p className="mt-2 max-w-3xl text-xs leading-relaxed text-[#9CA3AF]">{sameSnapshotCrossRef}</p>
            ) : null}
          </div>
          <Link
            href="/logistics-progress"
            className="app-button-secondary px-3 py-2 text-sm font-medium"
          >
            {en ? "Open module" : "进入模块"}
          </Link>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            {en ? "Range" : "区间"}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={lPreset}
              onChange={(e) => setLPreset(e.target.value as RangePreset)}
            >
              <option value="pm3">{en ? "Current month ±3 months" : "当前月 ±3 个月"}</option>
              <option value="12m">{en ? "Last 12 months" : "近 12 个月"}</option>
              <option value="ytd">{en ? "YTD" : "本年"}</option>
              <option value="custom">{en ? "Custom" : "自定义"}</option>
            </select>
          </label>
          {lPreset === "custom" ? (
            <>
              <label className="min-w-0 text-xs font-medium text-[#4B5563]">
                {en ? "From" : "从"}
                <input
                  type="date"
                  className="mt-1 w-full bg-white px-3 py-2 text-sm"
                  value={lFrom}
                  onChange={(e) => setLFrom(e.target.value)}
                />
              </label>
              <label className="min-w-0 text-xs font-medium text-[#4B5563]">
                {en ? "To" : "至"}
                <input
                  type="date"
                  className="mt-1 w-full bg-white px-3 py-2 text-sm"
                  value={lTo}
                  onChange={(e) => setLTo(e.target.value)}
                />
              </label>
            </>
          ) : (
            <p className="text-xs text-slate-500 sm:col-span-2 md:col-span-3 xl:col-span-2 dark:text-slate-400">
              {lDateRange.from} → {lDateRange.to}
            </p>
          )}
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            {en ? "Granularity" : "粒度"}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={lGrain}
              onChange={(e) => setLGrain(e.target.value as Grain)}
            >
              <option value="month">{en ? "Month" : "月"}</option>
              <option value="quarter">{en ? "Quarter" : "季"}</option>
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            {en ? "Status" : "状态"}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={lStatus}
              onChange={(e) => setLStatus(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              <option value="not_shipped">not_shipped</option>
              <option value="in_transit">in_transit</option>
              <option value="delivered">delivered</option>
              <option value="cancelled">cancelled</option>
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            {en ? "Movement" : "类型"}
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={lMove}
              onChange={(e) => setLMove(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              <option value="inbound">inbound</option>
              <option value="transfer">transfer</option>
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            From
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={lFromLoc}
              onChange={(e) => setLFromLoc(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              {logFromLocs.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-xs font-medium text-[#4B5563]">
            To
            <select
              className="mt-1 w-full bg-white px-3 py-2 text-sm"
              value={lToLoc}
              onChange={(e) => setLToLoc(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              {logToLocs.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="app-card min-w-0 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{en ? "Shipments" : "运单数"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(lKpi.total)}</p>
          </article>
          <article className="app-card min-w-0 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{en ? "Qty" : "件数"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(lKpi.qty)}</p>
          </article>
          <article className="app-card min-w-0 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{en ? "In transit" : "运输中"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(lKpi.in_transit)}</p>
          </article>
          <article className="app-card min-w-0 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{en ? "Delivered" : "已送达"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(lKpi.delivered)}</p>
          </article>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="app-card min-w-0 h-72 p-2">
            {chartDataL.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartDataL}
                  onClick={(s) =>
                    chartClickLog(s && typeof s === "object" && "activeLabel" in s ? String(s.activeLabel) : undefined)
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<Tx />} />
                  <Legend />
                  <Line type="monotone" dataKey="count" name={en ? "Shipments" : "运单"} stroke={COLORS.blue} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-[#9CA3AF]">—</p>
            )}
          </div>
          <div className="app-card min-w-0 h-72 p-2">
            {chartDataL.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataL}
                  onClick={(s) =>
                    chartClickLog(s && typeof s === "object" && "activeLabel" in s ? String(s.activeLabel) : undefined)
                  }
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<Tx />} />
                  <Legend />
                  <Bar dataKey="not_shipped" name="not_shipped" stackId="s" fill={COLORS.violet} />
                  <Bar dataKey="in_transit" name="in_transit" stackId="s" fill={COLORS.amber} />
                  <Bar dataKey="delivered" name="delivered" stackId="s" fill={COLORS.emerald} />
                  <Bar dataKey="cancelled" name="cancelled" stackId="s" fill={COLORS.rose} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-[#9CA3AF]">—</p>
            )}
          </div>
        </div>
      </section>

      {drill ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-app-border bg-white shadow-[0_24px_60px_rgba(17,24,39,0.18)]">
            <div className="flex items-center justify-between border-b border-app-border px-4 py-3">
              <h3 className="text-sm font-semibold text-[#111827]">
                {en ? "Detail" : "明细"} · {drill.label}
              </h3>
              <button
                type="button"
                className="app-button-secondary px-3 py-1.5 text-sm"
                onClick={() => setDrill(null)}
              >
                {en ? "Close" : "关闭"}
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-4 text-sm">
              {drill.module === "order" ? (
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="border-b border-app-border text-left text-[#9CA3AF]">
                      <th className="py-2 pr-2">{en ? "Order no." : "订单号"}</th>
                      <th className="py-2 pr-2">SKU</th>
                      <th className="py-2 pr-2">{en ? "Qty" : "数量"}</th>
                      <th className="py-2 pr-2">{en ? "Progress" : "进度"}</th>
                      <th className="py-2 pr-2">{en ? "Order date" : "下单日"}</th>
                      <th className="py-2 pr-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {drill.rows.map((r) => (
                      <tr key={r.id} className="border-b border-app-border/60">
                        <td className="py-2 pr-2 font-medium">{r.orderNumber}</td>
                        <td className="py-2 pr-2">{r.sku}</td>
                        <td className="py-2 pr-2 tabular-nums">{formatNum(r.quantity)}</td>
                        <td className="py-2 pr-2">{r.progress}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">{r.orderDate}</td>
                        <td className="py-2 pr-2">
                          <Link href="/order-progress" className="text-[var(--app-accent)] hover:underline">
                            {en ? "Module" : "模块"}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="border-b border-app-border text-left text-[#9CA3AF]">
                      <th className="py-2 pr-2">PO</th>
                      <th className="py-2 pr-2">SKU</th>
                      <th className="py-2 pr-2 text-right">{en ? "Qty" : "数量"}</th>
                      <th className="py-2 pr-2">{en ? "Status" : "状态"}</th>
                      <th className="py-2 pr-2">{en ? "Created" : "创建时间"}</th>
                      <th className="py-2 pr-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {drill.rows.map((r) => (
                      <tr key={r.id} className="border-b border-app-border/60">
                        <td className="py-2 pr-2">{r.poNumber}</td>
                        <td className="py-2 pr-2">{r.sku}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{formatNum(r.quantity)}</td>
                        <td className="py-2 pr-2">{r.status}</td>
                        <td className="py-2 pr-2 whitespace-nowrap text-xs">{r.createdAt.slice(0, 19)}</td>
                        <td className="py-2 pr-2">
                          <Link href="/logistics-progress" className="text-[var(--app-accent)] hover:underline">
                            {en ? "Module" : "模块"}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
