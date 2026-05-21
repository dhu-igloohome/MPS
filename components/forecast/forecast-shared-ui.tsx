"use client";

import type { ReactNode } from "react";

import type { Language } from "@/lib/i18n";

export type ForecastKpiSnapshot = {
  bto: number;
  bts: number;
  total: number;
  rowCount: number;
  skuCount: number;
};

export function formatForecastNum(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

type ForecastCompactKpiStripProps = {
  language: Language;
  kpi: ForecastKpiSnapshot;
  labels: {
    bto: string;
    bts: string;
    total: string;
    rows: string;
    sku: string;
    totalHint?: string;
  };
  className?: string;
};

/** Same visual language as Dashboard Forecast section (compact KPI strip). */
export function ForecastCompactKpiStrip({ language, kpi, labels, className = "" }: ForecastCompactKpiStripProps) {
  const en = language === "en";
  return (
    <div
      className={`grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 ${className}`.trim()}
      aria-label={en ? "Forecast summary for current scope" : "当前范围 Forecast 摘要"}
    >
      <article className="min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-gradient-to-br from-white to-[#fff4f1]/80 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{labels.bto}</p>
        <p className="mt-1 text-right text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatForecastNum(kpi.bto)}
        </p>
      </article>
      <article className="min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-gradient-to-br from-white to-emerald-50/60 px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{labels.bts}</p>
        <p className="mt-1 text-right text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatForecastNum(kpi.bts)}
        </p>
      </article>
      <article
        className="min-w-0 overflow-hidden rounded-lg border border-app-accent/35 bg-gradient-to-br from-white to-[#fff4f1]/90 px-3 py-2.5 ring-1 ring-app-accent/15"
        title={labels.totalHint}
      >
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{labels.total}</p>
        <p className="mt-1 text-right text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatForecastNum(kpi.total)}
        </p>
      </article>
      <article className="min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-white px-3 py-2.5">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{labels.rows}</p>
        <p className="mt-1 text-right text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatForecastNum(kpi.rowCount)}
        </p>
      </article>
      <article className="col-span-2 min-w-0 overflow-hidden rounded-lg border border-app-border/90 bg-white px-3 py-2.5 sm:col-span-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-[#9CA3AF]">{labels.sku}</p>
        <p className="mt-1 text-right text-lg font-semibold tabular-nums leading-tight text-[#111827] sm:text-xl">
          {formatForecastNum(kpi.skuCount)}
        </p>
      </article>
    </div>
  );
}

type ForecastSectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function ForecastSectionHeader({ title, subtitle, action }: ForecastSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-l-4 border-app-accent bg-gradient-to-r from-[#fff4f1]/40 to-transparent px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-app-muted">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
