"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
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

import {
  aggregateForecastQuarters,
  aggregateLogisticsQuarters,
  aggregateOrderQuarters,
  buildForecastMonthlySeries,
  buildLogisticsMonthlySeries,
  buildOrderMonthlySeries,
  drillForecastForMonth,
  drillForecastForQuarter,
  drillLogisticsForMonth,
  drillLogisticsForQuarter,
  drillOrdersForMonth,
  drillOrdersForQuarterOp,
  filterForecastByDims,
  filterForecastByMonthRange,
  filterLogistics,
  filterLogisticsByDateRange,
  filterOrderByDateRange,
  filterOrderProgress,
  forecastKpis,
  getForecastMonthRangePreset,
  logisticsKpis,
  monthKeysForForecastRange,
  orderKpis,
} from "@/lib/cockpit-dashboard-agg";
import { getDateRangePreset, monthKeysBetween, type RangePreset } from "@/lib/cash-flow-dashboard-agg";
import type { Language } from "@/lib/i18n";
import type {
  ForecastEntry,
  LogisticsShipmentEntry,
  OrderProgressEntry,
  OrderProgressRegion,
  Region,
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
  forecasts: ForecastEntry[];
  orderProgress: OrderProgressEntry[];
  logistics: LogisticsShipmentEntry[];
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
    <div className="rounded-lg border border-slate-200/80 bg-white/95 px-3 py-2 text-xs shadow-lg dark:border-slate-600 dark:bg-slate-900/95">
      <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">{label}</p>
      {payload.map((p) => (
        <p key={p.name} className="tabular-nums text-slate-600 dark:text-slate-300">
          <span style={{ color: p.color }}>{p.name}: </span>
          {formatNum(Number(p.value))}
        </p>
      ))}
    </div>
  );
}

type Grain = "month" | "quarter";
type DrillState =
  | { module: "forecast"; label: string; rows: ForecastEntry[] }
  | { module: "order"; label: string; rows: OrderProgressEntry[] }
  | { module: "logistics"; label: string; rows: LogisticsShipmentEntry[] }
  | null;

export function CockpitVisualizations({ language, forecasts, orderProgress, logistics }: Props) {
  const en = language === "en";

  const [fPreset, setFPreset] = useState<RangePreset>("pm3");
  const [fMonthFrom, setFMonthFrom] = useState("");
  const [fMonthTo, setFMonthTo] = useState("");
  const [fRegion, setFRegion] = useState("");
  const [fDest, setFDest] = useState("");
  const [fProduct, setFProduct] = useState("");
  const [fGrain, setFGrain] = useState<Grain>("month");

  const [oPreset, setOPreset] = useState<RangePreset>("12m");
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

  const fMonthRange = useMemo(
    () => getForecastMonthRangePreset(fPreset, fMonthFrom, fMonthTo),
    [fPreset, fMonthFrom, fMonthTo],
  );
  const fFiltered = useMemo(() => {
    const dims = filterForecastByDims(forecasts, {
      region: fRegion,
      destination: fDest,
      productName: fProduct,
    });
    return filterForecastByMonthRange(dims, fMonthRange.from, fMonthRange.to);
  }, [forecasts, fRegion, fDest, fProduct, fMonthRange.from, fMonthRange.to]);
  const fKpi = useMemo(() => forecastKpis(fFiltered), [fFiltered]);
  const fChart = useMemo(() => {
    const keys = monthKeysForForecastRange(fMonthRange.from, fMonthRange.to);
    const m = buildForecastMonthlySeries(fFiltered, keys);
    return fGrain === "month" ? m : aggregateForecastQuarters(m);
  }, [fFiltered, fMonthRange, fGrain]);

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

  const forecastOptions = useMemo(() => {
    const regions = [...new Set(forecasts.map((e) => e.region))].sort() as Region[];
    const dest = [...new Set(forecasts.map((e) => e.destination).filter(Boolean))].sort();
    const prod = [...new Set(forecasts.map((e) => e.productName))].sort();
    return { regions, dest, prod };
  }, [forecasts]);

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

  const openForecastDrill = useCallback(
    (key: string) => {
      const rows = fGrain === "month" ? drillForecastForMonth(fFiltered, key) : drillForecastForQuarter(fFiltered, key);
      setDrill({ module: "forecast", label: key, rows });
    },
    [fFiltered, fGrain],
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

  const chartDataF = fChart.map((p) => ({ ...p, name: p.label }));
  const chartDataO = oChart.map((p) => ({ ...p, name: p.label }));
  const chartDataL = lChart.map((p) => ({ ...p, name: p.label }));

  const chartClick = (key: string | undefined, mod: "f" | "o" | "l") => {
    if (!key) return;
    if (mod === "f") openForecastDrill(key);
    else if (mod === "o") openOrderDrill(key);
    else openLogDrill(key);
  };

  return (
    <div className="space-y-10">
      {/* Forecast */}
      <section className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-900/50 dark:to-slate-900/80">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              {en ? "Forecast input" : "Forecast 填报"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {en
                ? "BTO / BTS by forecast month — default range is current month ±3 months; click chart to drill down."
                : "按填报月份 — 默认区间为当前月前后各 3 个自然月；点击图表下钻明细。"}
            </p>
          </div>
          <Link
            href="/forecast"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-slate-50 dark:border-slate-600 dark:text-indigo-300 dark:hover:bg-slate-800"
          >
            {en ? "Open Forecast" : "打开 Forecast"}
          </Link>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Range" : "区间"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={fPreset}
              onChange={(e) => setFPreset(e.target.value as RangePreset)}
            >
              <option value="pm3">{en ? "Current month ±3 months" : "当前月 ±3 个月"}</option>
              <option value="12m">{en ? "Last 12 months" : "近 12 个月"}</option>
              <option value="ytd">{en ? "YTD" : "本年"}</option>
              <option value="custom">{en ? "Custom" : "自定义"}</option>
            </select>
          </label>
          {fPreset === "custom" ? (
            <>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {en ? "From" : "从"}
                <input
                  type="month"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={fMonthFrom}
                  onChange={(e) => setFMonthFrom(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {en ? "To" : "至"}
                <input
                  type="month"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={fMonthTo}
                  onChange={(e) => setFMonthTo(e.target.value)}
                />
              </label>
            </>
          ) : (
            <p className="text-xs text-slate-500 md:col-span-2 dark:text-slate-400">
              {fMonthRange.from} → {fMonthRange.to}
            </p>
          )}
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Granularity" : "粒度"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={fGrain}
              onChange={(e) => setFGrain(e.target.value as Grain)}
            >
              <option value="month">{en ? "Month" : "月"}</option>
              <option value="quarter">{en ? "Quarter" : "季"}</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Region" : "区域"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={fRegion}
              onChange={(e) => setFRegion(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              {forecastOptions.regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Destination
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={fDest}
              onChange={(e) => setFDest(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              {forecastOptions.dest.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 xl:col-span-2">
            {en ? "Product" : "产品"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={fProduct}
              onChange={(e) => setFProduct(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              {forecastOptions.prod.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "BTO" : "按单生产"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-blue-700 dark:text-blue-300">{formatNum(fKpi.bto)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "BTS" : "备货生产"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{formatNum(fKpi.bts)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "Total" : "合计"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">{formatNum(fKpi.total)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "SKU count" : "SKU 数"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatNum(fKpi.skuCount)}</p>
          </article>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-xl border border-slate-100 bg-white/50 p-2 dark:border-slate-800 dark:bg-slate-900/40">
            {chartDataF.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartDataF}
                  onClick={(s) => chartClick(s && typeof s === "object" && "activeLabel" in s ? String(s.activeLabel) : undefined, "f")}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNum(Number(v))} />
                  <Tooltip content={<Tx />} />
                  <Legend />
                  <Line type="monotone" dataKey="bto" name="BTO" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="bts" name="BTS" stroke={COLORS.emerald} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">—</p>
            )}
          </div>
          <div className="h-72 rounded-xl border border-slate-100 bg-white/50 p-2 dark:border-slate-800 dark:bg-slate-900/40">
            {chartDataF.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataF}
                  onClick={(s) => chartClick(s && typeof s === "object" && "activeLabel" in s ? String(s.activeLabel) : undefined, "f")}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNum(Number(v))} />
                  <Tooltip content={<Tx />} />
                  <Legend />
                  <Bar dataKey="bto" name="BTO" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="bts" name="BTS" fill={COLORS.emerald} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-slate-400">—</p>
            )}
          </div>
        </div>
      </section>

      {/* Order progress */}
      <section className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-900/50 dark:to-slate-900/80">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              {en ? "Order progress" : "订单进度"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {en
                ? "By order date — default range is current month ±3 months; click chart to drill down."
                : "按下单日 — 默认区间为当前月前后各 3 个自然月；点击图表下钻。"}
            </p>
          </div>
          <Link
            href="/order-progress"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-slate-50 dark:border-slate-600 dark:text-indigo-300 dark:hover:bg-slate-800"
          >
            {en ? "Open module" : "进入模块"}
          </Link>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Range" : "区间"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
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
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {en ? "From" : "从"}
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={oFrom}
                  onChange={(e) => setOFrom(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {en ? "To" : "至"}
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={oTo}
                  onChange={(e) => setOTo(e.target.value)}
                />
              </label>
            </>
          ) : (
            <p className="text-xs text-slate-500 md:col-span-2 dark:text-slate-400">
              {oDateRange.from} → {oDateRange.to}
            </p>
          )}
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Granularity" : "粒度"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={oGrain}
              onChange={(e) => setOGrain(e.target.value as Grain)}
            >
              <option value="month">{en ? "Month" : "月"}</option>
              <option value="quarter">{en ? "Quarter" : "季"}</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Region" : "区域"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
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
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Factory" : "工厂"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
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
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300 xl:col-span-2">
            {en ? "Progress" : "进度"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
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

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "Orders" : "订单行数"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">{formatNum(oKpi.total)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "Qty" : "数量"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatNum(oKpi.qty)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "In production" : "生产中"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">{formatNum(oKpi.in_production)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "Ready to ship" : "待发货"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{formatNum(oKpi.ready_to_ship)}</p>
          </article>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-xl border border-slate-100 bg-white/50 p-2 dark:border-slate-800 dark:bg-slate-900/40">
            {chartDataO.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartDataO}
                  onClick={(s) => chartClick(s && typeof s === "object" && "activeLabel" in s ? String(s.activeLabel) : undefined, "o")}
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
              <p className="flex h-full items-center justify-center text-sm text-slate-400">—</p>
            )}
          </div>
          <div className="h-72 rounded-xl border border-slate-100 bg-white/50 p-2 dark:border-slate-800 dark:bg-slate-900/40">
            {chartDataO.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataO}
                  onClick={(s) => chartClick(s && typeof s === "object" && "activeLabel" in s ? String(s.activeLabel) : undefined, "o")}
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
              <p className="flex h-full items-center justify-center text-sm text-slate-400">—</p>
            )}
          </div>
        </div>
      </section>

      {/* Logistics */}
      <section className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50/90 to-white p-5 shadow-sm dark:border-slate-700 dark:from-slate-900/50 dark:to-slate-900/80">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              {en ? "Logistics progress" : "物流进度"}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {en
                ? "By shipment create date — default range is current month ±3 months; click chart to drill down."
                : "按物流记录创建时间 — 默认区间为当前月前后各 3 个自然月；点击图表下钻。"}
            </p>
          </div>
          <Link
            href="/logistics-progress"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-slate-50 dark:border-slate-600 dark:text-indigo-300 dark:hover:bg-slate-800"
          >
            {en ? "Open module" : "进入模块"}
          </Link>
        </div>

        <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Range" : "区间"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
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
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {en ? "From" : "从"}
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={lFrom}
                  onChange={(e) => setLFrom(e.target.value)}
                />
              </label>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {en ? "To" : "至"}
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={lTo}
                  onChange={(e) => setLTo(e.target.value)}
                />
              </label>
            </>
          ) : (
            <p className="text-xs text-slate-500 md:col-span-2 dark:text-slate-400">
              {lDateRange.from} → {lDateRange.to}
            </p>
          )}
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Granularity" : "粒度"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={lGrain}
              onChange={(e) => setLGrain(e.target.value as Grain)}
            >
              <option value="month">{en ? "Month" : "月"}</option>
              <option value="quarter">{en ? "Quarter" : "季"}</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Status" : "状态"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
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
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            {en ? "Movement" : "类型"}
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
              value={lMove}
              onChange={(e) => setLMove(e.target.value)}
            >
              <option value="">{en ? "All" : "全部"}</option>
              <option value="inbound">inbound</option>
              <option value="transfer">transfer</option>
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            From
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
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
          <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
            To
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
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

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "Shipments" : "运单数"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">{formatNum(lKpi.total)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "Qty" : "件数"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-800 dark:text-slate-100">{formatNum(lKpi.qty)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "In transit" : "运输中"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-amber-700 dark:text-amber-300">{formatNum(lKpi.in_transit)}</p>
          </article>
          <article className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{en ? "Delivered" : "已送达"}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-300">{formatNum(lKpi.delivered)}</p>
          </article>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 rounded-xl border border-slate-100 bg-white/50 p-2 dark:border-slate-800 dark:bg-slate-900/40">
            {chartDataL.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartDataL}
                  onClick={(s) => chartClick(s && typeof s === "object" && "activeLabel" in s ? String(s.activeLabel) : undefined, "l")}
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
              <p className="flex h-full items-center justify-center text-sm text-slate-400">—</p>
            )}
          </div>
          <div className="h-72 rounded-xl border border-slate-100 bg-white/50 p-2 dark:border-slate-800 dark:bg-slate-900/40">
            {chartDataL.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartDataL}
                  onClick={(s) => chartClick(s && typeof s === "object" && "activeLabel" in s ? String(s.activeLabel) : undefined, "l")}
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
              <p className="flex h-full items-center justify-center text-sm text-slate-400">—</p>
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
          <div className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-600 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {en ? "Detail" : "明细"} · {drill.label}
              </h3>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                onClick={() => setDrill(null)}
              >
                {en ? "Close" : "关闭"}
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-4 text-sm">
              {drill.module === "forecast" ? (
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
                      <th className="py-2 pr-2">{en ? "Month" : "月份"}</th>
                      <th className="py-2 pr-2">{en ? "Region" : "区域"}</th>
                      <th className="py-2 pr-2">SKU</th>
                      <th className="py-2 pr-2 text-right">BTO</th>
                      <th className="py-2 pr-2 text-right">BTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drill.rows.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-2">{r.month}</td>
                        <td className="py-2 pr-2">{r.region}</td>
                        <td className="py-2 pr-2">{r.sku}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{formatNum(r.buildToOrder)}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{formatNum(r.buildToStock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : drill.module === "order" ? (
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
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
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-2 font-medium">{r.orderNumber}</td>
                        <td className="py-2 pr-2">{r.sku}</td>
                        <td className="py-2 pr-2 tabular-nums">{formatNum(r.quantity)}</td>
                        <td className="py-2 pr-2">{r.progress}</td>
                        <td className="py-2 pr-2 whitespace-nowrap">{r.orderDate}</td>
                        <td className="py-2 pr-2">
                          <Link href="/order-progress" className="text-indigo-600 hover:underline dark:text-indigo-400">
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
                    <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700">
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
                      <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800">
                        <td className="py-2 pr-2">{r.poNumber}</td>
                        <td className="py-2 pr-2">{r.sku}</td>
                        <td className="py-2 pr-2 text-right tabular-nums">{formatNum(r.quantity)}</td>
                        <td className="py-2 pr-2">{r.status}</td>
                        <td className="py-2 pr-2 whitespace-nowrap text-xs">{r.createdAt.slice(0, 19)}</td>
                        <td className="py-2 pr-2">
                          <Link href="/logistics-progress" className="text-indigo-600 hover:underline dark:text-indigo-400">
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
