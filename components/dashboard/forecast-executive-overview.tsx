"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  aggregateForecastByRegion,
  aggregateForecastTopProducts,
  forecastKpis,
} from "@/lib/cockpit-dashboard-agg";
import { formatDataSnapshot, formatSamePageSnapshotCrossRef } from "@/lib/format-data-snapshot";
import type { Language } from "@/lib/i18n";
import { buildSupplyFunnel } from "@/lib/dashboard-insights";
import type { ForecastEntry, FulfillmentGroup, FulfillmentShipmentEntry } from "@/lib/types";

const PIE_COLORS = ["#ee6454", "#2563eb", "#059669", "#d97706", "#7c3aed", "#e11d48"];

type Props = {
  language: Language;
  /** ISO instant from the server; same as dashboard header (cross-ref under title). */
  dataSnapshotAt?: string;
  forecasts: ForecastEntry[];
  /** Forecast # + SKU groups (with contracted qty) and shipments, for the quantity funnel. */
  fulfillmentGroups?: FulfillmentGroup[];
  shipments?: FulfillmentShipmentEntry[];
  /** When set, shows next to “Open Forecast” in the section toolbar (e.g. CSV export). */
  forecastExport?: { href: string; label: string; snapshotToken?: string };
};

function formatNum(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: { name: string; value: number; bto: number; bts: number } }[];
}) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-app-border bg-white/95 px-3 py-2 text-xs shadow-[0_8px_24px_rgba(17,24,39,0.08)]">
      <p className="font-medium text-[#111827]">{p.name}</p>
      <p className="tabular-nums text-[#4B5563]">
        BTO: {formatNum(p.bto)} · BTS: {formatNum(p.bts)}
      </p>
      <p className="tabular-nums text-[#111827]">{formatNum(p.value)} total</p>
    </div>
  );
}

export function ForecastExecutiveOverview({
  language,
  dataSnapshotAt,
  forecasts,
  fulfillmentGroups,
  shipments,
  forecastExport,
}: Props) {
  const en = language === "en";

  const availableForecastMonths = useMemo(
    () => [...new Set(forecasts.map((e) => e.month))].sort(),
    [forecasts],
  );

  const latestRowIso = useMemo(() => {
    if (forecasts.length === 0) return null;
    let max = -Infinity;
    for (const e of forecasts) {
      const n = new Date(e.createdAt).getTime();
      if (!Number.isNaN(n) && n > max) max = n;
    }
    return max === -Infinity ? null : new Date(max).toISOString();
  }, [forecasts]);

  /** Explicit month selection; `undefined` means “all months in data”. */
  const [selectedForecastMonths, setSelectedForecastMonths] = useState<string[] | undefined>(undefined);

  useEffect(() => {
    setSelectedForecastMonths(undefined);
  }, [forecasts]);

  const filteredForecasts = useMemo(() => {
    if (selectedForecastMonths !== undefined && selectedForecastMonths.length === 0) {
      return [];
    }
    const monthKeys = selectedForecastMonths ?? availableForecastMonths;
    if (monthKeys.length === 0) return [];
    const allow = new Set(monthKeys);
    return forecasts.filter((e) => allow.has(e.month));
  }, [forecasts, selectedForecastMonths, availableForecastMonths]);

  const kpi = useMemo(() => forecastKpis(filteredForecasts), [filteredForecasts]);
  const byRegion = useMemo(() => aggregateForecastByRegion(filteredForecasts), [filteredForecasts]);
  const topProducts = useMemo(() => aggregateForecastTopProducts(filteredForecasts, 10), [filteredForecasts]);

  const funnel = useMemo(
    () =>
      buildSupplyFunnel(
        fulfillmentGroups ?? [],
        shipments ?? [],
        new Set((selectedForecastMonths ?? availableForecastMonths).map((m) => m.slice(0, 7))),
      ),
    [fulfillmentGroups, shipments, selectedForecastMonths, availableForecastMonths],
  );
  const funnelMax = Math.max(funnel.forecast, funnel.contracted, funnel.recorded, funnel.delivered);

  const t = {
    funnelTitle: en ? "Forecast → contract → shipment → delivered" : "预测 → 合同 → 发货 → 送达",
    funnelHint: en
      ? "Quantities for the selected forecast months. Percentages are relative to forecast."
      : "所选 Forecast 月份的数量；百分比以 Forecast 数量为 100%。",
    funnelNote: en
      ? "Shipment = SO quantity of all Order fulfillments rows (including “In preparation”, so it is not only goods already moving). Contracts count approved/sent contracts linked to the forecast line; a contract can exceed its forecast, so 100%+ is possible."
      : "发货 = 订单履约里所有货运行的 SO 数量（含“备货中”，并非都已出发）。合同只统计已批准/已发出、且关联到该 Forecast 行的合同；合同数量可能大于 Forecast，所以可能超过 100%。",
    title: en ? "Forecast at a glance" : "Forecast 全景",
    bto: en ? "Build to order" : "按单 (BTO)",
    bts: en ? "Build to stock" : "备货 (BTS)",
    total: en ? "Total volume" : "合计数量",
    rows: en ? "Rows" : "填报行数",
    sku: en ? "SKUs" : "SKU 数",
    byRegion: en ? "Volume by region" : "各区域数量占比",
    topProducts: en ? "Top products by volume" : "产品数量 Top",
    empty: en ? "No forecast data yet." : "暂无 Forecast 数据。",
    openForecast: en ? "Open Forecast" : "打开 Forecast 填报",
    fcMonthFilter: en ? "Forecast Month" : "Forecast 月份",
    fcMonthHint: en
      ? "Choose months to filter KPIs and charts in this section."
      : "选择月份以筛选本节 KPI 与图表。",
    fcMonthReset: en ? "All months" : "全部月份",
    fcMonthNone: en ? "No months match." : "没有符合条件的月份。",
    dataContext: en
      ? "Scope: forecast rows in your assigned regions only (same as list permissions)."
      : "范围：仅包含您有权限区域内的 Forecast 记录（与列表权限一致）。",
    latestRowLabel: en ? "Latest row (by created time)" : "最新填报（按创建时间）",
    evidenceHeading: en ? "Three anchors" : "三条读数依据",
    e1Title: en ? "Unified filter" : "统一筛选",
    e1Body: en
      ? "KPIs, region split, and product Top all read from the same Forecast Month selection."
      : "KPI、区域占比、产品 Top 均来自同一组 Forecast 月份筛选后的数据集。",
    e2Title: en ? "Same scope as the list" : "与列表同源",
    e2Body: en
      ? "Rows are limited to your assigned regions — the same permission mask as the Forecast table."
      : "行级权限与 Forecast 列表一致，仅展示您被分配区域内的记录。",
    e3Title: en ? "One total definition" : "合计口径",
    e3Body: en
      ? "Every “total volume” in this section is BTO + BTS for the selected months (summary strip and charts)."
      : "本节所有「合计数量」均为所选月份内 BTO + BTS（含右侧摘要与下方图表）。",
    exportSnapshotHint: en
      ? "This export carries the same dashboard “as of” instant in CSV metadata. Tabular sections are re-read from the database when you download."
      : "此导出会在 CSV 元数据中写入与本页「数据截至」一致的快照时间；表格区在您点击下载时会再次从数据库读取。",
    readingNotesSummary: en ? "Notes" : "说明",
  };

  const funnelRows = [
    { key: "forecast", label: en ? "Forecast" : "Forecast 预测", value: funnel.forecast, color: "#9CA3AF", hint: "" },
    { key: "contracted", label: en ? "Contracted" : "已签合同", value: funnel.contracted, color: "#2563eb", hint: "" },
    { key: "recorded", label: en ? "Shipment recorded" : "已录入发货", value: funnel.recorded, color: "#d97706", hint: "" },
    { key: "delivered", label: en ? "Delivered" : "已送达", value: funnel.delivered, color: "#059669", hint: "" },
  ];

  const latestRowDisplay = latestRowIso ? formatDataSnapshot(latestRowIso, language) : null;

  const pageSnapshotCrossRef = useMemo(
    () => (dataSnapshotAt ? formatSamePageSnapshotCrossRef(dataSnapshotAt, language) : null),
    [dataSnapshotAt, language],
  );

  const exportCsvHref = useMemo(() => {
    if (!forecastExport?.snapshotToken) return forecastExport?.href ?? "";
    const sep = forecastExport.href.includes("?") ? "&" : "?";
    return `${forecastExport.href}${sep}t=${encodeURIComponent(forecastExport.snapshotToken)}`;
  }, [forecastExport]);

  const readingNotesDetails = (
    <div className="space-y-2 border-l border-app-border/60 pl-3 pt-1 text-xs leading-relaxed text-[#6B7280]">
      {pageSnapshotCrossRef ? <p>{pageSnapshotCrossRef}</p> : null}
      <p>{t.dataContext}</p>
      {latestRowDisplay ? (
        <p>
          <span className="font-medium text-[#374151]">{t.latestRowLabel}</span>
          {": "}
          <span className="tabular-nums text-[#374151]">{latestRowDisplay}</span>
        </p>
      ) : null}
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">{t.evidenceHeading}</p>
      <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
        {(
          [
            [t.e1Title, t.e1Body],
            [t.e2Title, t.e2Body],
            [t.e3Title, t.e3Body],
          ] as const
        ).map(([title, body], i) => (
          <div
            key={i}
            className="min-w-0 rounded-lg border border-app-border/70 bg-white/80 px-3 py-2 shadow-sm"
          >
            <p className="text-xs font-semibold text-[#374151]">
              {i + 1}. {title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-[#6B7280]">{body}</p>
          </div>
        ))}
      </div>
      {forecastExport?.snapshotToken ? <p className="text-xs text-[#6B7280]">{t.exportSnapshotHint}</p> : null}
    </div>
  );


  const compactKpiStrip = (
    <div
      className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-5"
      aria-label={en ? "Forecast summary for selected months" : "所选月份 Forecast 摘要"}
    >
      <article className="min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-gradient-to-br from-white to-[#fff4f1]/80 px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t.bto}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatNum(kpi.bto)}
        </p>
      </article>
      <article className="min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-gradient-to-br from-white to-emerald-50/60 px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t.bts}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatNum(kpi.bts)}
        </p>
      </article>
      <article
        className="min-w-0 overflow-hidden rounded-lg border border-app-accent/35 bg-gradient-to-br from-white to-[#fff4f1]/90 px-3 py-2.5 ring-1 ring-app-accent/15"
        title={t.e3Body}
      >
        <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t.total}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatNum(kpi.total)}
        </p>
      </article>
      <article className="min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-white px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t.rows}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatNum(kpi.rowCount)}
        </p>
      </article>
      <article className="col-span-2 min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-white px-3 py-2.5 sm:col-span-1">
        <p className="text-xs font-medium uppercase tracking-wide text-[#6B7280]">{t.sku}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatNum(kpi.skuCount)}
        </p>
      </article>
    </div>
  );

  const readingNotes = (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer select-none text-[#6B7280] hover:text-[#6B7280]">
        {t.readingNotesSummary}
      </summary>
      {readingNotesDetails}
    </details>
  );

  const allMonthsActive = selectedForecastMonths === undefined;

  const toolbar = (
    <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto">
      {forecastExport ? (
        <a
          href={exportCsvHref || forecastExport.href}
          className="app-button-secondary inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition duration-150 ease-out hover:-translate-y-px active:translate-y-0"
        >
          {forecastExport.label}
        </a>
      ) : null}
      <Link
        href="/forecast"
        className="app-button-primary inline-flex items-center justify-center px-3 py-2 text-sm font-semibold transition duration-150 ease-out hover:-translate-y-px active:translate-y-0"
      >
        {t.openForecast}
      </Link>
      {forecasts.length > 0 ? (
        <button
          type="button"
          title={t.fcMonthHint}
          className={`inline-flex shrink-0 items-center justify-center rounded-lg border px-3 py-2 text-sm font-medium transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 ${
            allMonthsActive
              ? "border-app-accent/50 bg-app-accent-soft text-[#111827] shadow-sm"
              : "border-app-border bg-white text-foreground/85 hover:border-app-accent/35 hover:bg-app-accent-soft"
          }`}
          onClick={() => setSelectedForecastMonths(undefined)}
        >
          {t.fcMonthReset}
        </button>
      ) : null}
    </div>
  );

  if (forecasts.length === 0) {
    return (
      <section className="app-card overflow-hidden p-6 shadow-sm">
        <div className="mb-6 min-w-0 border-b border-app-border/60 pb-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <h2 className="min-w-0 flex-1 break-words text-lg font-semibold tracking-tight text-[#111827]">{t.title}</h2>
            {toolbar}
          </div>
          {readingNotes}
        </div>
        <p className="text-center text-sm text-[#6B7280]">{t.empty}</p>
      </section>
    );
  }

  return (
    <section className="app-card overflow-hidden p-6 shadow-sm">
      <div className="mb-6 min-w-0 border-b border-app-border/60 pb-6">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h2 className="min-w-0 flex-1 break-words text-lg font-semibold tracking-tight text-[#111827]">{t.title}</h2>
          {toolbar}
        </div>
      </div>

      <div className="mb-6 min-w-0 rounded-xl border border-app-border/80 bg-gradient-to-br from-[#fafafa] to-white p-4 shadow-sm sm:p-5">
        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17rem,28rem)] lg:items-start lg:gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,32rem)]">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]" title={t.fcMonthHint}>
              {t.fcMonthFilter}
            </p>
        {availableForecastMonths.length === 0 ? (
          <p className="mt-4 text-sm text-[#6B7280]">{t.fcMonthNone}</p>
        ) : (
          <div className="mt-4 min-w-0 overflow-x-auto overscroll-x-contain pb-0.5 [-webkit-overflow-scrolling:touch]">
            <div className="flex w-max max-w-none flex-nowrap gap-2 sm:w-auto sm:flex-wrap sm:pr-0">
              {availableForecastMonths.map((mk) => {
              const explicit = selectedForecastMonths;
              const checked = explicit === undefined ? true : explicit.includes(mk);
                return (
                  <label
                    key={mk}
                    className={`inline-flex min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm tabular-nums transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 ${
                    checked
                      ? "border-app-accent/50 bg-app-accent-soft text-[#111827] shadow-sm"
                      : "border-app-border/90 bg-white text-[#374151] hover:border-app-accent/35 hover:bg-app-accent-soft/60"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 shrink-0 rounded border-app-border text-app-accent-text focus:ring-[var(--app-accent)]"
                      checked={checked}
                      onChange={() => {
                        if (explicit === undefined) {
                          setSelectedForecastMonths(availableForecastMonths.filter((m) => m !== mk));
                          return;
                        }
                        const next = checked
                          ? explicit.filter((m) => m !== mk)
                          : [...explicit, mk].sort();
                        if (next.length === 0) {
                          setSelectedForecastMonths([]);
                          return;
                        }
                        if (next.length === availableForecastMonths.length) {
                          setSelectedForecastMonths(undefined);
                          return;
                        }
                        setSelectedForecastMonths(next);
                      }}
                    />
                    <span>{mk}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
          </div>
          <div className="min-w-0 lg:pt-5">{compactKpiStrip}</div>
        </div>
        {readingNotes}
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 overflow-hidden">
          <h3 className="mb-2 truncate text-sm font-semibold text-[#111827]" title={t.byRegion}>
            {t.byRegion}
          </h3>
          <div className="app-panel h-[280px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={byRegion}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  label={({ percent }) => `${Math.round((Number(percent) || 0) * 100)}%`}
                >
                  {byRegion.map((_, i) => (
                    <Cell key={String(i)} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="#fff" strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="min-w-0 overflow-hidden">
          <h3 className="mb-2 truncate text-sm font-semibold text-[#111827]" title={t.topProducts}>
            {t.topProducts}
          </h3>
          <div className="app-panel h-[280px] p-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={topProducts} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatNum(Number(v))} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={108}
                  tick={{ fontSize: 10 }}
                  interval={0}
                />
                <Tooltip
                  formatter={(value) => formatNum(Number(value ?? 0))}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload as { fullName?: string; name: string } | undefined;
                    return p?.fullName ?? p?.name ?? "";
                  }}
                  contentStyle={{ borderRadius: "0.75rem", fontSize: "12px" }}
                />
                <Bar dataKey="total" fill="#ee6454" radius={[0, 6, 6, 0]} name={t.total} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 min-w-0">
        <h3 className="mb-1 text-sm font-semibold text-[#111827]">{t.funnelTitle}</h3>
        <p className="mb-3 text-xs text-[#6B7280]">{t.funnelHint}</p>
        <div className="app-panel space-y-3 p-4">
          {funnelRows.map((r) => (
            <div key={r.key} className="min-w-0">
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-[#374151]" title={r.hint}>
                  {r.label}
                </span>
                <span className="shrink-0 tabular-nums text-[#111827]">
                  {formatNum(r.value)}
                  {funnel.forecast > 0 && r.key !== "forecast" ? (
                    <span className="ml-2 text-xs text-[#6B7280]">
                      {Math.round((r.value / funnel.forecast) * 100)}%
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.min(100, funnelMax > 0 ? (r.value / funnelMax) * 100 : 0)}%`, background: r.color }}
                />
              </div>
            </div>
          ))}
          <p className="pt-1 text-xs leading-relaxed text-[#6B7280]">{t.funnelNote}</p>
        </div>
      </div>
    </section>
  );
}
