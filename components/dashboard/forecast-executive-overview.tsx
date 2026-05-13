"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
  buildForecastMonthlySeries,
  forecastKpis,
  monthKeysForForecastRange,
} from "@/lib/cockpit-dashboard-agg";
import { formatDataSnapshot, formatSamePageSnapshotCrossRef } from "@/lib/format-data-snapshot";
import type { Language } from "@/lib/i18n";
import type { ForecastEntry } from "@/lib/types";

const PIE_COLORS = ["#ee6454", "#2563eb", "#059669", "#d97706", "#7c3aed", "#e11d48"];

type Props = {
  language: Language;
  /** ISO instant from the server; same as dashboard header (cross-ref under title). */
  dataSnapshotAt?: string;
  forecasts: ForecastEntry[];
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

export function ForecastExecutiveOverview({ language, dataSnapshotAt, forecasts, forecastExport }: Props) {
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

  const trendData = useMemo(() => {
    if (filteredForecasts.length === 0) return [];
    const keys =
      selectedForecastMonths && selectedForecastMonths.length > 0
        ? [...selectedForecastMonths].sort()
        : (() => {
            let min = filteredForecasts[0].month;
            let max = filteredForecasts[0].month;
            for (const e of filteredForecasts) {
              if (e.month < min) min = e.month;
              if (e.month > max) max = e.month;
            }
            return monthKeysForForecastRange(min, max);
          })();
    return buildForecastMonthlySeries(filteredForecasts, keys).map((p) => ({
      ...p,
      name: p.label,
    }));
  }, [filteredForecasts, selectedForecastMonths]);

  const t = {
    title: en ? "Forecast at a glance" : "Forecast 全景",
    subtitle: en
      ? "All forecast records in your scope — volume by region, top products, and monthly BTO vs BTS."
      : "当前权限内全部 Forecast 记录 — 区域占比、产品 Top、月度 BTO/BTS 走势。",
    bto: en ? "Build to order" : "按单 (BTO)",
    bts: en ? "Build to stock" : "备货 (BTS)",
    total: en ? "Total volume" : "合计数量",
    rows: en ? "Rows" : "填报行数",
    sku: en ? "SKUs" : "SKU 数",
    byRegion: en ? "Volume by region" : "各区域数量占比",
    topProducts: en ? "Top products by volume" : "产品数量 Top",
    trend: en ? "Monthly trend (BTO vs BTS)" : "月度走势（BTO / BTS）",
    empty: en ? "No forecast data yet." : "暂无 Forecast 数据。",
    openForecast: en ? "Open Forecast" : "打开 Forecast 填报",
    fcMonthFilter: en ? "Forecast Month" : "Forecast 月份",
    fcMonthHint: en
      ? "Multi-select months to filter KPIs and charts. The large figure in the chart section is BTO + BTS for the selection."
      : "多选月份可筛选本节 KPI 与图表；图表区大号数字为所选月份的 BTO + BTS 合计。",
    fcMonthReset: en ? "All months" : "全部月份",
    fcMonthNone: en ? "No months match." : "没有符合条件的月份。",
    chartZoneTotal: en ? "Total volume (chart scope)" : "合计数量（图表区）",
    chartZoneTotalHint: en ? "Sum of BTO + BTS for the selected Forecast Months — same as Total volume KPI." : "与上方 KPI「合计数量」一致：所选 Forecast 月份内 BTO + BTS 之和。",
    dataContext: en
      ? "Scope: forecast rows in your assigned regions only (same as list permissions)."
      : "范围：仅包含您有权限区域内的 Forecast 记录（与列表权限一致）。",
    latestRowLabel: en ? "Latest row (by created time)" : "最新填报（按创建时间）",
    evidenceHeading: en ? "Three anchors" : "三条读数依据",
    e1Title: en ? "Unified filter" : "统一筛选",
    e1Body: en
      ? "KPIs, region split, product Top, and the trend chart all read from the same Forecast Month selection."
      : "KPI、区域占比、产品 Top、走势均来自同一组 Forecast 月份筛选后的数据集。",
    e2Title: en ? "Same scope as the list" : "与列表同源",
    e2Body: en
      ? "Rows are limited to your assigned regions — the same permission mask as the Forecast table."
      : "行级权限与 Forecast 列表一致，仅展示您被分配区域内的记录。",
    e3Title: en ? "One total definition" : "合计口径",
    e3Body: en
      ? "Every “total volume” in this section is BTO + BTS for the selected months, including the large chart figure."
      : "本节所有「合计数量」均为所选月份内 BTO + BTS，含图表区大号数字。",
    exportSnapshotHint: en
      ? "This export carries the same dashboard “as of” instant in CSV metadata. Tabular sections are re-read from the database when you download."
      : "此导出会在 CSV 元数据中写入与本页「数据截至」一致的快照时间；表格区在您点击下载时会再次从数据库读取。",
  };

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

  const trustBlock = (
    <div className="mt-2 space-y-2">
      {pageSnapshotCrossRef ? (
        <p className="max-w-prose text-xs leading-relaxed text-[#9CA3AF]">{pageSnapshotCrossRef}</p>
      ) : null}
      <p className="text-xs text-[#9CA3AF]">{t.dataContext}</p>
      {latestRowDisplay ? (
        <p className="text-xs text-[#9CA3AF]">
          <span className="font-medium text-[#6B7280]">{t.latestRowLabel}</span>
          {": "}
          <span className="tabular-nums text-[#6B7280]">{latestRowDisplay}</span>
        </p>
      ) : null}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{t.evidenceHeading}</p>
        <div className="mt-2 grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
          {(
            [
              [t.e1Title, t.e1Body],
              [t.e2Title, t.e2Body],
              [t.e3Title, t.e3Body],
            ] as const
          ).map(([title, body], i) => (
            <div
              key={i}
              className="min-w-0 rounded-lg border border-app-border/70 bg-white/80 px-3 py-2.5 shadow-sm"
            >
              <p className="text-xs font-semibold text-[#374151]">
                {i + 1}. {title}
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#6B7280]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const toolbar = (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
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
        className="app-button-primary inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition duration-150 ease-out hover:-translate-y-px active:translate-y-0"
      >
        {t.openForecast}
      </Link>
    </div>
  );

  if (forecasts.length === 0) {
    return (
      <section className="app-card overflow-hidden p-6 shadow-sm">
        <div className="mb-6 min-w-0 border-b border-app-border/60 pb-6">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold tracking-tight text-[#111827]">{t.title}</h2>
              <p className="mt-1 max-w-prose text-sm text-[#4B5563]">{t.subtitle}</p>
              {trustBlock}
            </div>
            {toolbar}
          </div>
          {forecastExport?.snapshotToken ? (
            <p className="mt-3 max-w-prose text-[11px] leading-relaxed text-[#9CA3AF]">{t.exportSnapshotHint}</p>
          ) : null}
        </div>
        <p className="text-center text-sm text-[#9CA3AF]">{t.empty}</p>
      </section>
    );
  }

  const allMonthsActive = selectedForecastMonths === undefined;

  return (
    <section className="app-card overflow-hidden p-6 shadow-sm">
      <div className="mb-6 min-w-0 border-b border-app-border/60 pb-6">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-[#111827]">{t.title}</h2>
            <p className="mt-1 max-w-prose text-sm text-[#4B5563]">{t.subtitle}</p>
            {trustBlock}
          </div>
          {toolbar}
        </div>
        {forecastExport?.snapshotToken ? (
          <p className="mt-3 max-w-prose text-[11px] leading-relaxed text-[#9CA3AF]">{t.exportSnapshotHint}</p>
        ) : null}
      </div>

      <div className="mb-6 min-w-0 rounded-xl border border-app-border/80 bg-gradient-to-br from-[#fafafa] to-white p-4 shadow-sm sm:p-5">
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">{t.fcMonthFilter}</p>
            <p className="mt-1 max-w-prose text-xs leading-relaxed text-[#6B7280]">{t.fcMonthHint}</p>
          </div>
          <button
            type="button"
            className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-medium transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 ${
              allMonthsActive
                ? "border-app-accent/50 bg-app-accent-soft text-[#111827] shadow-sm"
                : "border-app-border bg-white text-foreground/85 hover:border-app-accent/35 hover:bg-app-accent-soft"
            }`}
            onClick={() => setSelectedForecastMonths(undefined)}
          >
            {t.fcMonthReset}
          </button>
        </div>
        {availableForecastMonths.length === 0 ? (
          <p className="mt-4 text-sm text-[#9CA3AF]">{t.fcMonthNone}</p>
        ) : (
          <div className="mt-4 flex min-w-0 flex-wrap gap-2">
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
                    className="h-3.5 w-3.5 shrink-0 rounded border-app-border text-[var(--app-accent)] focus:ring-[var(--app-accent)]"
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
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <article className="min-w-0 rounded-xl border border-app-border/90 bg-gradient-to-br from-white to-[#fff4f1]/80 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{t.bto}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(kpi.bto)}</p>
        </article>
        <article className="min-w-0 rounded-xl border border-app-border/90 bg-gradient-to-br from-white to-emerald-50/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{t.bts}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(kpi.bts)}</p>
        </article>
        <article className="min-w-0 rounded-xl border border-app-border/90 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{t.total}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(kpi.total)}</p>
        </article>
        <article className="min-w-0 rounded-xl border border-app-border/90 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{t.rows}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(kpi.rowCount)}</p>
        </article>
        <article className="min-w-0 rounded-xl border border-app-border/90 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9CA3AF]">{t.sku}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-[#111827]">{formatNum(kpi.skuCount)}</p>
        </article>
      </div>

      <div className="mb-6 rounded-2xl border border-app-border/90 bg-gradient-to-br from-white via-white to-[#fff4f1]/70 px-5 py-6 sm:px-8 sm:py-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">{t.chartZoneTotal}</p>
        <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[#6B7280]">{t.chartZoneTotalHint}</p>
        <p className="mt-4 text-4xl font-semibold tracking-tight tabular-nums text-[#111827] sm:text-5xl">
          {formatNum(kpi.total)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-[#111827]">{t.byRegion}</h3>
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
                  label={({ name, percent }) => `${String(name)} ${Math.round((Number(percent) || 0) * 100)}%`}
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

        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-semibold text-[#111827]">{t.topProducts}</h3>
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

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold text-[#111827]">{t.trend}</h3>
        <div className="app-panel h-[320px] p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="fillBtoExec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillBtsExec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#059669" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={trendData.length > 14 ? -35 : 0} textAnchor={trendData.length > 14 ? "end" : "middle"} height={trendData.length > 14 ? 56 : 28} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatNum(Number(v))} />
              <Tooltip
                formatter={(value) => formatNum(Number(value ?? 0))}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ borderRadius: "0.75rem", fontSize: "12px" }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="bto"
                name="BTO"
                stroke="#2563eb"
                strokeWidth={2}
                fill="url(#fillBtoExec)"
              />
              <Area
                type="monotone"
                dataKey="bts"
                name="BTS"
                stroke="#059669"
                strokeWidth={2}
                fill="url(#fillBtsExec)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
