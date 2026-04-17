"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { formatUsd } from "@/lib/format-usd";
import type { Language } from "@/lib/i18n";
import type { ForecastCashFlowRow, UnitCostQuoteEntry } from "@/lib/types";

type Props = {
  language: Language;
  /** Same source as Supply Chain → Cost control → Forecast cash flow (Comment = Ok, enriched). */
  rows: ForecastCashFlowRow[];
};

function forecastLineTotalUsd(row: ForecastCashFlowRow): number | null {
  if (row.unitPriceUsd == null) return null;
  const qty = Number(row.buildToOrder) + Number(row.buildToStock);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  return row.unitPriceUsd * qty;
}

function formatPoIssueDateEnglish(ymd: string | null | undefined): string {
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function LandedCostConsolidatePanel({ language, rows: initialRows }: Props) {
  const router = useRouter();
  const en = language === "en";
  const t = {
    title: en ? "Forecast cash flow (for dashboard)" : "Forecast 现金流（看板汇总）",
    hint: en
      ? "Line total from Unit cost; PO issue date in English. Same data and edits as Supply Chain → Cost control → Cash flow analysis (forecast rows with Comment = Ok)."
      : "行总金额来自单位成本；订单下达日期以英文展示。数据与编辑与「供应链 → 成本控制 → 现金流分析」中的 Forecast 现金流行（评论为 Ok）一致。",
    supplier: en ? "Supplier name" : "供应商名称",
    sku: "SKU",
    bto: en ? "Build to Order" : "按单生产",
    bts: en ? "Build to Stock" : "备货生产",
    poIssue: en ? "PO issue date" : "订单下达日期",
    total: en ? "Total amount (USD)" : "总金额 (USD)",
    poIssueTitle:
      language === "en"
        ? "Order date in English; use the picker to change."
        : "订单日期以英文展示，可用日期选择器修改。",
    empty: en
      ? "No forecast cash flow rows (Comment must be Ok on the Forecast page)."
      : "暂无 Forecast 现金流数据（请在 Forecast 页将评论设为 Ok）。",
    sumLabel: en ? "Sum (computable lines)" : "可计算行合计",
    sumEmpty: en ? "No rows with a computable total (pick supplier + Unit cost quote)." : "暂无可计算总金额的行（请选择供应商并确保单位成本有报价）。",
    saveErr: en ? "Could not save PO issue date." : "保存订单下达日期失败。",
    na: "—",
  };

  const [rows, setRows] = useState(initialRows);
  const [poSavingId, setPoSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const dashboardRows = useMemo(() => {
    return rows.map((row) => ({
      row,
      lineTotal: forecastLineTotalUsd(row),
      supplierLabel: row.cashFlowSupplierName.trim() || t.na,
    }));
  }, [rows, t.na]);

  const sumComputable = useMemo(
    () => dashboardRows.reduce((s, x) => s + (x.lineTotal ?? 0), 0),
    [dashboardRows],
  );

  async function persistFcPoIssueDate(forecastId: string, isoDay: string) {
    setPoSavingId(forecastId);
    setMessage("");
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
    setPoSavingId(null);
    if (!res.ok) {
      setMessage(data.message || t.saveErr);
      return;
    }
    setRows((prev) =>
      prev.map((r) =>
        r.id === forecastId
          ? {
              ...r,
              cashFlowSupplierName: String(data.supplierName ?? r.cashFlowSupplierName),
              unitPriceUsd: data.unitPriceUsd ?? r.unitPriceUsd,
              poIssueDate: data.poIssueDate !== undefined ? data.poIssueDate : r.poIssueDate,
              cashFlowShippingMode: data.shippingMode === "air" ? "air" : "ocean",
              latestUnitCostQuote: data.latestUnitCostQuote ?? r.latestUnitCostQuote,
            }
          : r,
      ),
    );
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="app-card p-4">
        <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.title}</h5>
        <p className="mt-1 text-xs text-[#9CA3AF]">{t.hint}</p>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-xs sm:text-sm">
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
              </tr>
            </thead>
            <tbody>
              {dashboardRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                dashboardRows.map(({ row, lineTotal, supplierLabel }) => (
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
                          onChange={(e) => void persistFcPoIssueDate(row.id, e.target.value)}
                          disabled={poSavingId === row.id}
                          className="w-full max-w-[11rem] rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                          aria-label={t.poIssue}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums">
                      {lineTotal != null ? formatUsd(lineTotal, 2) : t.na}
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
                    </>
                  ) : (
                    <td colSpan={6} className="py-3 text-center text-xs text-slate-400">
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
