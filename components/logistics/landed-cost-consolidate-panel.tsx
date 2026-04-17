"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { FORECAST_INCOTERMS, type ForecastIncoterm } from "@/lib/forecast-incoterm";
import { formatUsd } from "@/lib/format-usd";
import type { Language } from "@/lib/i18n";
import type { ForecastCashFlowRow, UnitCostQuoteEntry } from "@/lib/types";

type Props = {
  language: Language;
  rows: ForecastCashFlowRow[];
};

function forecastLineTotalUsd(row: ForecastCashFlowRow): number | null {
  if (row.unitPriceUsd == null) return null;
  const qty = Number(row.buildToOrder) + Number(row.buildToStock);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return row.unitPriceUsd * qty;
}

/** Landed = Total amount (USD) × (tariff % / 100) + Freight (USD/unit) × (BTO + BTS qty). */
function computeLogisticsLandedCostUsd(row: ForecastCashFlowRow): number | null {
  const qty = Number(row.buildToOrder) + Number(row.buildToStock);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const lineTotal = forecastLineTotalUsd(row);
  if (lineTotal == null || !Number.isFinite(lineTotal)) return null;
  const tariff = row.cashFlowDestinationTariffPct;
  const freight = row.cashFlowFreightUsdPerUnit;
  const t = tariff != null && Number.isFinite(tariff) ? tariff : 0;
  const f = freight != null && Number.isFinite(freight) ? freight : 0;
  return lineTotal * (t / 100) + f * qty;
}

function formatPoIssueDateEnglish(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function effectiveIncoterm(row: ForecastCashFlowRow): ForecastIncoterm {
  return row.cashFlowIncoterm ?? row.incoterm;
}

type PatchResponse = {
  message?: string;
  supplierName?: string;
  unitPriceUsd?: number | null;
  poIssueDate?: string | null;
  shippingMode?: ForecastCashFlowRow["cashFlowShippingMode"];
  latestUnitCostQuote?: UnitCostQuoteEntry | null;
  destinationTariffPct?: number | null;
  freightUsdPerUnit?: number | null;
  cashFlowIncoterm?: ForecastIncoterm | null;
};

function mergeRowFromPatch(r: ForecastCashFlowRow, data: PatchResponse): ForecastCashFlowRow {
  return {
    ...r,
    cashFlowSupplierName: data.supplierName !== undefined ? String(data.supplierName) : r.cashFlowSupplierName,
    unitPriceUsd: data.unitPriceUsd !== undefined ? data.unitPriceUsd : r.unitPriceUsd,
    poIssueDate: data.poIssueDate !== undefined ? data.poIssueDate : r.poIssueDate,
    cashFlowShippingMode:
      data.shippingMode !== undefined ? (data.shippingMode === "air" ? "air" : "ocean") : r.cashFlowShippingMode,
    latestUnitCostQuote: data.latestUnitCostQuote !== undefined ? data.latestUnitCostQuote : r.latestUnitCostQuote,
    cashFlowDestinationTariffPct:
      data.destinationTariffPct !== undefined ? data.destinationTariffPct : r.cashFlowDestinationTariffPct,
    cashFlowFreightUsdPerUnit:
      data.freightUsdPerUnit !== undefined ? data.freightUsdPerUnit : r.cashFlowFreightUsdPerUnit,
    cashFlowIncoterm: data.cashFlowIncoterm !== undefined ? data.cashFlowIncoterm : r.cashFlowIncoterm,
  };
}

export function LandedCostConsolidatePanel({ language, rows: initialRows }: Props) {
  const router = useRouter();
  const en = language === "en";
  const t = {
    title: en ? "Forecast cash flow (for dashboard)" : "Forecast 现金流（看板汇总）",
    hint: en
      ? "Line total from Unit cost; PO issue date in English. Same persisted row as Supply Chain → Cost control → Cash flow analysis. Landed cost (USD) = Total amount (USD) × (Destination tariff % ÷ 100) + Freight cost (USD/unit) × (Build to Order + Build to Stock)."
      : "行总金额来自单位成本；订单下达日期以英文展示；与「供应链 → 成本控制 → 现金流分析」共用同一套持久化数据。Landed cost (USD) = 总金额 (USD) ×（目的国关税 % ÷ 100）+ 运费 (USD/单位) ×（按单生产 + 备货生产数量）。",
    supplier: en ? "Supplier name" : "供应商名称",
    sku: "SKU",
    bto: en ? "Build to Order" : "按单生产",
    bts: en ? "Build to Stock" : "备货生产",
    poIssue: en ? "PO issue date" : "订单下达日期",
    total: en ? "Total amount (USD)" : "总金额 (USD)",
    tariff: en ? "Destination tariff (%)" : "目的国关税 (%)",
    ship: en ? "Shipping mode" : "运输方式",
    shipOcean: en ? "Shipping: ocean" : "运输方式 · 海运",
    shipAir: en ? "Shipping: air" : "运输方式 · 空运",
    freight: en ? "Freight cost (USD / Unit)" : "运费 (USD/单位)",
    incoterm: "Incoterm",
    landed: en ? "Landed cost (USD)" : "到岸成本 (USD)",
    poIssueTitle:
      language === "en"
        ? "Order date in English; use the picker to change."
        : "订单日期以英文展示，可用日期选择器修改。",
    empty: en
      ? "No forecast cash flow rows (Comment must be Ok on the Forecast page)."
      : "暂无 Forecast 现金流数据（请在 Forecast 页将评论设为 Ok）。",
    sumLabel: en ? "Sum (computable lines)" : "可计算行合计",
    sumEmpty: en ? "No rows with a computable total (pick supplier + Unit cost quote)." : "暂无可计算总金额的行（请选择供应商并确保单位成本有报价）。",
    saveErr: en ? "Save failed." : "保存失败。",
    na: "—",
  };

  const [rows, setRows] = useState(initialRows);
  const [rowSavingId, setRowSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const dashboardRows = useMemo(() => {
    return rows.map((row) => ({
      row,
      lineTotal: forecastLineTotalUsd(row),
      landed: computeLogisticsLandedCostUsd(row),
      supplierLabel: row.cashFlowSupplierName.trim() || t.na,
    }));
  }, [rows, t.na]);

  const sumComputable = useMemo(
    () => dashboardRows.reduce((s, x) => s + (x.lineTotal ?? 0), 0),
    [dashboardRows],
  );
  const sumLanded = useMemo(
    () => dashboardRows.reduce((s, x) => s + (x.landed ?? 0), 0),
    [dashboardRows],
  );

  async function patchForecast(forecastId: string, body: Record<string, unknown>) {
    setRowSavingId(forecastId);
    setMessage("");
    const res = await fetch("/api/cost-control/forecast-cash-flow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forecastId, ...body }),
    });
    const data = (await res.json().catch(() => ({}))) as PatchResponse;
    setRowSavingId(null);
    if (!res.ok) {
      setMessage(data.message || t.saveErr);
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === forecastId ? mergeRowFromPatch(r, data) : r)));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="app-card p-4">
        <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.title}</h5>
        <p className="mt-1 text-xs text-[#9CA3AF]">{t.hint}</p>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1280px] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="py-2 pr-3">{t.supplier}</th>
                <th className="py-2 pr-3">{t.sku}</th>
                <th className="py-2 pr-3 text-right tabular-nums">{t.bto}</th>
                <th className="py-2 pr-3 text-right tabular-nums">{t.bts}</th>
                <th className="min-w-[10rem] py-2 pr-3" title={t.poIssueTitle}>
                  {t.poIssue}
                </th>
                <th className="py-2 pr-3 text-right">{t.total}</th>
                <th className="min-w-[7rem] py-2 pr-3 text-right">{t.tariff}</th>
                <th className="min-w-[9rem] py-2 pr-3">{t.ship}</th>
                <th className="min-w-[8rem] py-2 pr-3 text-right">{t.freight}</th>
                <th className="min-w-[6rem] py-2 pr-3">{t.incoterm}</th>
                <th className="py-2 pr-3 text-right">{t.landed}</th>
              </tr>
            </thead>
            <tbody>
              {dashboardRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                dashboardRows.map(({ row, lineTotal, landed, supplierLabel }) => (
                  <tr key={row.id} className="border-b border-app-border/60">
                    <td className="max-w-[12rem] truncate py-2 pr-3">{supplierLabel}</td>
                    <td className="py-2 pr-3 font-medium">{row.sku}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.buildToOrder}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{row.buildToStock}</td>
                    <td className="py-2 pr-3 align-top" lang="en">
                      <div className="flex min-w-[9rem] flex-col gap-1">
                        <span className="whitespace-nowrap tabular-nums text-xs font-medium text-slate-800 dark:text-slate-100">
                          {row.poIssueDate ? formatPoIssueDateEnglish(row.poIssueDate) : t.na}
                        </span>
                        <input
                          type="date"
                          value={row.poIssueDate ?? ""}
                          onChange={(e) => void patchForecast(row.id, { poIssueDate: e.target.value || null })}
                          disabled={rowSavingId === row.id}
                          className="w-full max-w-[11rem] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          aria-label={t.poIssue}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {lineTotal != null ? formatUsd(lineTotal, 2) : t.na}
                    </td>
                    <td className="py-2 pr-3 text-right align-top">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        defaultValue={row.cashFlowDestinationTariffPct ?? ""}
                        key={`tariff-${row.id}-${row.cashFlowDestinationTariffPct ?? "x"}`}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          if (raw === "") {
                            void patchForecast(row.id, { destinationTariffPct: null });
                            return;
                          }
                          const n = Number(raw);
                          if (!Number.isFinite(n) || n < 0 || n > 100) {
                            setMessage(en ? "Tariff must be between 0 and 100." : "关税须在 0–100 之间。");
                            return;
                          }
                          void patchForecast(row.id, { destinationTariffPct: n });
                        }}
                        disabled={rowSavingId === row.id}
                        className="w-full max-w-[6.5rem] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums dark:border-slate-600 dark:bg-slate-800"
                        aria-label={t.tariff}
                      />
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <select
                        value={row.cashFlowShippingMode}
                        onChange={(e) =>
                          void patchForecast(row.id, {
                            shippingMode: e.target.value as ForecastCashFlowRow["cashFlowShippingMode"],
                          })
                        }
                        disabled={rowSavingId === row.id}
                        className="w-full max-w-[11rem] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                        aria-label={t.ship}
                      >
                        <option value="ocean">{t.shipOcean}</option>
                        <option value="air">{t.shipAir}</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-right align-top">
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        defaultValue={row.cashFlowFreightUsdPerUnit ?? ""}
                        key={`freight-${row.id}-${row.cashFlowFreightUsdPerUnit ?? "x"}`}
                        onBlur={(e) => {
                          const raw = e.target.value.trim();
                          if (raw === "") {
                            void patchForecast(row.id, { freightUsdPerUnit: null });
                            return;
                          }
                          const n = Number(raw);
                          if (!Number.isFinite(n) || n < 0) {
                            setMessage(en ? "Freight must be a non-negative number." : "运费须为非负数。");
                            return;
                          }
                          void patchForecast(row.id, { freightUsdPerUnit: n });
                        }}
                        disabled={rowSavingId === row.id}
                        className="w-full max-w-[7rem] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-right text-xs tabular-nums dark:border-slate-600 dark:bg-slate-800"
                        aria-label={t.freight}
                      />
                    </td>
                    <td className="py-2 pr-3 align-top">
                      <select
                        value={effectiveIncoterm(row)}
                        onChange={(e) =>
                          void patchForecast(row.id, {
                            cashFlowIncoterm: e.target.value as ForecastIncoterm,
                          })
                        }
                        disabled={rowSavingId === row.id}
                        className="w-full max-w-[5.5rem] rounded-lg border border-slate-200 bg-white px-1 py-1 text-xs dark:border-slate-600 dark:bg-slate-800"
                        aria-label={t.incoterm}
                      >
                        {FORECAST_INCOTERMS.map((ic) => (
                          <option key={ic} value={ic}>
                            {ic}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums font-medium">
                      {landed != null ? formatUsd(landed, 2) : t.na}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {dashboardRows.length > 0 ? (
              <tfoot>
                <tr className="border-t border-slate-200 dark:border-slate-600">
                  {sumComputable > 0 ? (
                    <>
                      <td className="py-2 pr-3 font-medium text-slate-600 dark:text-slate-300" colSpan={5}>
                        {t.sumLabel}
                      </td>
                      <td className="py-2 pr-3 text-right text-base font-semibold tabular-nums text-indigo-700 dark:text-indigo-300">
                        {formatUsd(sumComputable, 2)}
                      </td>
                      <td colSpan={4} className="py-2 pr-3 text-right text-xs text-slate-500 dark:text-slate-400">
                        {en ? "Σ Landed cost" : "到岸成本合计"}
                      </td>
                      <td className="py-2 pr-3 text-right text-base font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                        {formatUsd(sumLanded, 2)}
                      </td>
                    </>
                  ) : (
                    <td colSpan={11} className="py-3 text-center text-xs text-slate-400">
                      {t.sumEmpty}
                    </td>
                  )}
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  );
}
