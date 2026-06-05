"use client";

import { useMemo, useState } from "react";

import { PaymentScheduleMatrixTable } from "@/components/cost-control/payment-schedule-matrix-table";
import {
  ccLabel,
  ccSelectMd,
  ccSelectSm,
} from "@/components/cost-control/cost-control-form-controls";
import type { Language } from "@/lib/i18n";
import {
  buildPaymentScheduleMatrix,
  filterRowsForSupplierReport,
  formatForecastMonthLabel,
  uniqueForecastEntryMonths,
  uniqueSuppliersFromRows,
} from "@/lib/payment-schedule-matrix";
import type { ForecastCashFlowRow, SupplierEntry } from "@/lib/types";

type Props = {
  language: Language;
  rows: ForecastCashFlowRow[];
  suppliers: SupplierEntry[];
};

const COPY = {
  en: {
    pageTitle: "Payment schedule reports",
    skuSection: "By SKU (payment due months)",
    skuHint:
      "Each row is one Forecast cash-flow SKU line. Month columns span the earliest deposit due month through the latest balance due month in the dataset (empty months show —). Amounts follow supplier Payment terms + Lead time.",
    supplierSection: "By supplier + Forecast month",
    supplierHint:
      "Filter by supplier and Forecast entry month (the month set when the forecast was created). Shows each SKU’s deposit and balance due amounts across the same unified month columns, plus supplier totals.",
    supplier: "Supplier",
    forecastMonth: "Forecast month",
    allMonths: "All months",
    selectSupplier: "Select supplier…",
    supplierRequired: "Select a supplier to view this report.",
    sku: "SKU",
    bto: "Build to Order",
    bts: "Build to Stock",
    poDate: "PO issue date",
    total: "Total amount (USD)",
    depositSection: "Deposit due in",
    balanceSection: "Balance due in",
    empty: "No rows with schedulable payments in scope.",
    totalRow: "Total",
    forecastMonthCol: "Forecast month",
  },
  zh: {
    pageTitle: "付款计划报表",
    skuSection: "按 SKU（应付月份）",
    skuHint:
      "每行对应一条 Forecast 现金流 SKU。月份列为数据集中最早订金应付月至最晚尾款应付月（无款月份显示 —）。金额按供应商 Payment terms + Lead time 计算。",
    supplierSection: "按供应商 + Forecast 录入月",
    supplierHint:
      "按供应商与 Forecast 录入月（创建 Forecast 时填写的月份）筛选。展示各 SKU 订金/尾款在各月的应付金额（统一月份列），并汇总供应商合计。",
    supplier: "供应商",
    forecastMonth: "Forecast 录入月",
    allMonths: "全部月份",
    selectSupplier: "选择供应商…",
    supplierRequired: "请先选择供应商。",
    sku: "SKU",
    bto: "按单生产",
    bts: "备货生产",
    poDate: "PO 开单日",
    total: "总金额 (USD)",
    depositSection: "订金应付",
    balanceSection: "尾款应付",
    empty: "当前范围内没有可排期的付款行。",
    totalRow: "合计",
    forecastMonthCol: "Forecast 录入月",
  },
};

export function PaymentScheduleReports({ language, rows, suppliers }: Props) {
  const t = COPY[language];
  const [supplierFilter, setSupplierFilter] = useState("");
  const [forecastMonthFilter, setForecastMonthFilter] = useState("all");

  const supplierOptions = useMemo(() => uniqueSuppliersFromRows(rows), [rows]);
  const forecastMonthOptions = useMemo(() => uniqueForecastEntryMonths(rows), [rows]);

  const skuMatrix = useMemo(
    () => buildPaymentScheduleMatrix(rows, suppliers),
    [rows, suppliers],
  );

  const supplierScopedRows = useMemo(
    () => filterRowsForSupplierReport(rows, supplierFilter, forecastMonthFilter),
    [rows, supplierFilter, forecastMonthFilter],
  );

  const supplierMatrix = useMemo(
    () => buildPaymentScheduleMatrix(supplierScopedRows, suppliers),
    [supplierScopedRows, suppliers],
  );

  const tableLabels = {
    supplier: t.supplier,
    sku: t.sku,
    bto: t.bto,
    bts: t.bts,
    poDate: t.poDate,
    total: t.total,
    depositSection: t.depositSection,
    balanceSection: t.balanceSection,
    empty: t.empty,
    totalRow: t.totalRow,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-app-border/80 bg-app-surface/70 p-4 shadow-sm">
        <h3 className="text-base font-semibold text-foreground">{t.skuSection}</h3>
        <details className="mt-1 text-xs text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {language === "en" ? "Notes" : "说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.skuHint}</p>
        </details>
        <PaymentScheduleMatrixTable matrix={skuMatrix} language={language} labels={tableLabels} />
      </section>

      <section className="rounded-2xl border border-app-border/80 bg-app-surface/70 p-4 shadow-sm">
        <h3 className="text-base font-semibold text-foreground">{t.supplierSection}</h3>
        <details className="mt-1 text-xs text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {language === "en" ? "Notes" : "说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.supplierHint}</p>
        </details>
        <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
          <label className="shrink-0">
            <span className={ccLabel}>{t.supplier} *</span>
            <select
              className={ccSelectMd}
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
            >
              <option value="">{t.selectSupplier}</option>
              {supplierOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{t.forecastMonth}</span>
            <select
              className={ccSelectSm}
              value={forecastMonthFilter}
              onChange={(e) => setForecastMonthFilter(e.target.value)}
            >
              <option value="all">{t.allMonths}</option>
              {forecastMonthOptions.map((mk) => (
                <option key={mk} value={mk}>
                  {formatForecastMonthLabel(mk, language)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!supplierFilter ? (
          <p className="mt-3 text-sm text-app-muted">{t.supplierRequired}</p>
        ) : (
          <PaymentScheduleMatrixTable
            matrix={supplierMatrix}
            language={language}
            labels={tableLabels}
            showForecastMonth={forecastMonthFilter === "all"}
            forecastMonthLabel={t.forecastMonthCol}
          />
        )}
      </section>
    </div>
  );
}
