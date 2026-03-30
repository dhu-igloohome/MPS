"use client";

import Link from "next/link";
import { useState } from "react";

import type { Language } from "@/lib/i18n";

export type PeriodAggRow = {
  period: string;
  total: number;
  advancePart: number;
  finalPart: number;
  byRegion: Record<string, number>;
};

export type TopSkuRow = {
  sku: string;
  region: string;
  supplier: string;
  totalScheduled: number;
};

type Props = {
  language: Language;
  monthly: { periods: PeriodAggRow[]; topSkus: TopSkuRow[] };
  quarterly: { periods: PeriodAggRow[]; topSkus: TopSkuRow[] };
};

const REGION_ORDER = ["APAC", "EU", "USA", "未关联"] as const;

function regionBarClass(region: string): string {
  switch (region) {
    case "APAC":
      return "bg-sky-500";
    case "EU":
      return "bg-emerald-500";
    case "USA":
      return "bg-amber-500";
    default:
      return "bg-slate-400";
  }
}

function formatMoney(n: number, language: Language) {
  if (language === "zh") {
    return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 0 }).format(n);
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export function CashFlowOverview({ language, monthly, quarterly }: Props) {
  const [mode, setMode] = useState<"month" | "quarter">("month");
  const data = mode === "month" ? monthly : quarterly;

  const t = {
    title: language === "en" ? "Cash flow overview" : "现金流概览",
    subtitle:
      language === "en"
        ? "Expected cash-out by period (advance on order date, final after payment term). SKU region & supplier from Order progress."
        : "按期间展示预期现金流出（下单日应付预付，账期后应付尾款）。SKU 地区与供应商来自订单进度关联。",
    month: language === "en" ? "Monthly" : "按月",
    quarter: language === "en" ? "Quarterly" : "按季",
    advance: language === "en" ? "Advance" : "预付",
    final: language === "en" ? "Final" : "尾款",
    total: language === "en" ? "Total" : "合计",
    byRegion: language === "en" ? "By region" : "按地区",
    topSku: language === "en" ? "Top SKU cash exposure" : "SKU 现金占用 Top",
    supplier: language === "en" ? "Supplier / factory" : "供应商 / 工厂",
    region: language === "en" ? "Region" : "地区",
    sku: language === "en" ? "SKU" : "SKU",
    period: language === "en" ? "Period" : "期间",
    openCost: language === "en" ? "Open cash flow module" : "打开现金流录入",
    empty: language === "en" ? "No cash flow rows yet. Add entries under Cost control." : "暂无现金流数据，请在成本控制中录入。",
  };

  const sortedRegions = (byRegion: Record<string, number>) => {
    const keys = Object.keys(byRegion);
    keys.sort((a, b) => {
      const ia = REGION_ORDER.indexOf(a as (typeof REGION_ORDER)[number]);
      const ib = REGION_ORDER.indexOf(b as (typeof REGION_ORDER)[number]);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return keys;
  };

  return (
    <section className="rounded-2xl border border-app-border/90 bg-gradient-to-b from-app-surface to-app-accent-soft/25 shadow-sm">
      <div className="border-b border-app-border/60 bg-app-surface/90 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
            <p className="mt-1 max-w-3xl text-sm text-app-muted">{t.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-app-border/80 bg-app-surface p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setMode("month")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  mode === "month"
                    ? "bg-app-accent text-white shadow"
                    : "text-app-muted hover:text-foreground"
                }`}
              >
                {t.month}
              </button>
              <button
                type="button"
                onClick={() => setMode("quarter")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  mode === "quarter"
                    ? "bg-app-accent text-white shadow"
                    : "text-app-muted hover:text-foreground"
                }`}
              >
                {t.quarter}
              </button>
            </div>
            <Link
              href="/cost-control"
              className="inline-flex items-center rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm font-medium text-foreground/90 hover:border-app-accent/40 hover:bg-app-accent-soft"
            >
              {t.openCost}
            </Link>
          </div>
        </div>
      </div>

      <div className="space-y-6 p-5">
        {data.periods.length === 0 ? (
          <p className="rounded-xl border border-dashed border-app-border/80 bg-app-muted/10 px-4 py-8 text-center text-sm text-app-muted">
            {t.empty}
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.topSkus.slice(0, 4).map((row, i) => (
                <article
                  key={row.sku}
                  className="relative overflow-hidden rounded-2xl border border-app-border/70 bg-app-surface p-4 shadow-sm"
                >
                  <div
                    className={`absolute right-0 top-0 h-16 w-16 -translate-y-4 translate-x-4 rounded-full opacity-20 ${
                      ["bg-sky-400", "bg-emerald-400", "bg-amber-400", "bg-violet-400"][i % 4]
                    }`}
                  />
                  <p className="text-xs font-medium uppercase tracking-wide text-app-muted">{t.sku}</p>
                  <p className="mt-1 truncate text-lg font-semibold text-foreground">{row.sku}</p>
                  <p className="mt-2 text-xs text-app-muted">
                    {t.region}: <span className="font-medium text-foreground/90">{row.region}</span>
                  </p>
                  <p className="text-xs text-app-muted">
                    {t.supplier}: <span className="font-medium text-foreground/90">{row.supplier}</span>
                  </p>
                  <p className="mt-3 text-2xl font-bold tabular-nums text-app-accent">
                    {formatMoney(row.totalScheduled, language)}
                  </p>
                  <p className="text-xs text-app-muted">{t.total}</p>
                </article>
              ))}
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">{t.byRegion}</h4>
              <div className="space-y-3">
                {data.periods.map((row) => (
                  <div key={row.period} className="rounded-xl border border-app-border/50 bg-app-surface/80 p-3">
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-mono text-sm font-semibold text-foreground">{row.period}</span>
                      <span className="text-sm tabular-nums text-foreground">
                        {formatMoney(row.total, language)}{" "}
                        <span className="text-xs font-normal text-app-muted">
                          ({t.advance} {formatMoney(row.advancePart, language)} + {t.final}{" "}
                          {formatMoney(row.finalPart, language)})
                        </span>
                      </span>
                    </div>
                    <div className="h-4 w-full overflow-hidden rounded-full bg-app-muted/30">
                      <div className="flex h-full w-full">
                        {row.total <= 0
                          ? null
                          : sortedRegions(row.byRegion).map((reg) => {
                              const v = row.byRegion[reg] ?? 0;
                              if (v <= 0) return null;
                              return (
                                <div
                                  key={reg}
                                  className={`${regionBarClass(reg)} h-full transition-all`}
                                  style={{ width: `${(v / row.total) * 100}%` }}
                                  title={`${reg}: ${formatMoney(v, language)}`}
                                />
                              );
                            })}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs">
                      {sortedRegions(row.byRegion).map((reg) => {
                        const v = row.byRegion[reg] ?? 0;
                        if (v <= 0) return null;
                        return (
                          <span key={reg} className="inline-flex items-center gap-1.5">
                            <span className={`inline-block h-2 w-2 rounded-sm ${regionBarClass(reg)}`} />
                            <span className="text-app-muted">{reg}</span>
                            <span className="font-medium tabular-nums text-foreground">{formatMoney(v, language)}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold text-foreground">{t.topSku}</h4>
              <div className="overflow-x-auto rounded-xl border border-app-border/60">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-app-border bg-app-muted/15 text-left text-app-muted">
                      <th className="px-3 py-2">{t.sku}</th>
                      <th className="px-3 py-2">{t.region}</th>
                      <th className="px-3 py-2">{t.supplier}</th>
                      <th className="px-3 py-2 text-right">{t.total}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topSkus.map((row) => (
                      <tr key={row.sku} className="border-b border-app-border/40 hover:bg-app-accent-soft/30">
                        <td className="px-3 py-2 font-medium">{row.sku}</td>
                        <td className="px-3 py-2">{row.region}</td>
                        <td className="max-w-[14rem] truncate px-3 py-2">{row.supplier}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-foreground">
                          {formatMoney(row.totalScheduled, language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
