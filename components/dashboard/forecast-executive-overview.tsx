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
  /** When set, shows next to ?Open Forecast? in the section toolbar (e.g. CSV export). */
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
        BTO: {formatNum(p.bto)} ? BTS: {formatNum(p.bts)}
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

  /** Explicit month selection; `undefined` means ?all months in data?. */
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
    title: en ? "Forecast at a glance" : "Forecast ??",
    bto: en ? "Build to order" : "?? (BTO)",
    bts: en ? "Build to stock" : "?? (BTS)",
    total: en ? "Total volume" : "????",
    rows: en ? "Rows" : "????",
    sku: en ? "SKUs" : "SKU ?",
    byRegion: en ? "Volume by region" : "???????",
    topProducts: en ? "Top products by volume" : "???? Top",
    trend: en ? "Monthly trend (BTO vs BTS)" : "?????BTO / BTS?",
    empty: en ? "No forecast data yet." : "?? Forecast ???",
    openForecast: en ? "Open Forecast" : "?? Forecast ??",
    fcMonthFilter: en ? "Forecast Month" : "Forecast ??",
    fcMonthHint: en
      ? "Choose months to filter KPIs and charts in this section."
      : "????????? KPI ????",
    fcMonthReset: en ? "All months" : "????",
    fcMonthNone: en ? "No months match." : "??????????",
    dataContext: en
      ? "Scope: forecast rows in your assigned regions only (same as list permissions)."
      : "?????????????? Forecast ????????????",
    latestRowLabel: en ? "Latest row (by created time)" : "???????????",
    evidenceHeading: en ? "Three anchors" : "??????",
    e1Title: en ? "Unified filter" : "????",
    e1Body: en
      ? "KPIs, region split, product Top, and the trend chart all read from the same Forecast Month selection."
      : "KPI???????? Top????????? Forecast ??????????",
    e2Title: en ? "Same scope as the list" : "?????",
    e2Body: en
      ? "Rows are limited to your assigned regions ? the same permission mask as the Forecast table."
      : "????? Forecast ???????????????????",
    e3Title: en ? "One total definition" : "????",
    e3Body: en
      ? "Every ?total volume? in this section is BTO + BTS for the selected months (summary strip and charts)."
      : "????????????????? BTO + BTS?????????????",
    exportSnapshotHint: en
      ? "This export carries the same dashboard ?as of? instant in CSV metadata. Tabular sections are re-read from the database when you download."
      : "????? CSV ???????????????????????????????????????????",
    readingNotesSummary: en ? "Notes" : "??",
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
      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#9CA3AF]">{t.evidenceHeading}</p>
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
            <p className="mt-1 text-[11px] leading-relaxed text-[#6B7280]">{body}</p>
          </div>
        ))}
      </div>
      {forecastExport?.snapshotToken ? <p className="text-[11px] text-[#6B7280]">{t.exportSnapshotHint}</p> : null}
    </div>
  );


  const compactKpiStrip = (
    <div
      className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-5"
      aria-label={en ? "Forecast summary for selected months" : "???? Forecast ??"}
    >
      <article className="min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-gradient-to-br from-white to-[#fff4f1]/80 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{t.bto}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatNum(kpi.bto)}
        </p>
      </article>
      <article className="min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-gradient-to-br from-white to-emerald-50/60 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{t.bts}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatNum(kpi.bts)}
        </p>
      </article>
      <article
        className="min-w-0 overflow-hidden rounded-lg border border-app-accent/35 bg-gradient-to-br from-white to-[#fff4f1]/90 px-3 py-2.5 ring-1 ring-app-accent/15"
        title={t.e3Body}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{t.total}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatNum(kpi.total)}
        </p>
      </article>
      <article className="min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-white px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{t.rows}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatNum(kpi.rowCount)}
        </p>
      </article>
      <article className="col-span-2 min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-white px-3 py-2.5 sm:col-span-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{t.sku}</p>
        <p className="mt-1 text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatNum(kpi.skuCount)}
        </p>
      </article>
    </div>
  );

  const readingNotes = (
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer select-none text-[#9CA3AF] hover:text-[#6B7280]">
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
        className="app-button-primary inline-flex items-center justify-center px-3 py-2 text-sm font-medium transition duration-150 ease-out hover:-translate-y-px active:translate-y-0"
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
        <p className="text-center text-sm text-[#9CA3AF]">{t.empty}</p>
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
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]" title={t.fcMonthHint}>
              {t.fcMonthFilter}
            </p>
            {availableForecastMonths.length === 0 ? (
          <p className="mt-4 text-sm text-[#9CA3AF]">{t.fcMonthNone}</p>
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

      <div className="mt-6 min-w-0 overflow-hidden">
        <h3 className="mb-2 truncate text-sm font-semibold text-[#111827]" title={t.trend}>
          {t.trend}
        </h3>
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
