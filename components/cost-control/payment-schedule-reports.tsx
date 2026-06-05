"use client";

import { useMemo, useState } from "react";

import { PaymentScheduleMatrixTable } from "@/components/cost-control/payment-schedule-matrix-table";
import { ccLabel, ccSelectSm } from "@/components/cost-control/cost-control-form-controls";
import type { Language } from "@/lib/i18n";
import {
  exportPaymentScheduleSkuCsv,
  exportPaymentScheduleSupplierCsv,
  paymentScheduleMatrixExportable,
} from "@/lib/payment-schedule-csv";
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
      "Each row is one Forecast cash-flow SKU line. Month columns span the earliest deposit due month through the latest balance due month in the dataset (months with no payment are left blank). Amounts follow supplier Payment terms + Lead time.",
    exportCsv: "Export CSV",
    exportEmpty: "No rows to export",
    supplierSection: "By supplier + Forecast month",
    supplierHint:
      "Check one or more suppliers and pick a Forecast entry month. Each supplier block lists SKU lines, then a supplier subtotal; the last row is the grand total across all checked suppliers.",
    supplier: "Suppliers",
    forecastMonth: "Forecast month",
    allMonths: "All months",
    selectAll: "Select all",
    clearAll: "Clear",
    supplierRequired: "Check at least one supplier to view this report.",
    sku: "SKU",
    bto: "Build to Order",
    bts: "Build to Stock",
    poDate: "PO issue date",
    total: "Total amount (USD)",
    depositSection: "Deposit due in",
    balanceSection: "Balance due in",
    empty: "No rows with schedulable payments in scope.",
    totalRow: "Grand total",
    supplierSubtotal: "Subtotal",
    forecastMonthCol: "Forecast month",
    selectedCount: (n: number) => `${n} selected`,
  },
  zh: {
    pageTitle: "付款计划报表",
    skuSection: "按 SKU（应付月份）",
    skuHint:
      "每行对应一条 Forecast 现金流 SKU。月份列为数据集中最早订金应付月至最晚尾款应付月（无款月份留空）。金额按供应商 Payment terms + Lead time 计算。",
    exportCsv: "导出 CSV",
    exportEmpty: "没有可导出的行",
    supplierSection: "按供应商 + Forecast 录入月",
    supplierHint:
      "可勾选一家或多家供应商，并选择 Forecast 录入月。每个供应商下列出各 SKU，随后一行供应商小计；最后一行为已选供应商总合计。",
    supplier: "供应商",
    forecastMonth: "Forecast 录入月",
    allMonths: "全部月份",
    selectAll: "全选",
    clearAll: "清空",
    supplierRequired: "请至少勾选一个供应商。",
    sku: "SKU",
    bto: "按单生产",
    bts: "备货生产",
    poDate: "PO 开单日",
    total: "总金额 (USD)",
    depositSection: "订金应付",
    balanceSection: "尾款应付",
    empty: "当前范围内没有可排期的付款行。",
    totalRow: "总合计",
    supplierSubtotal: "小计",
    forecastMonthCol: "Forecast 录入月",
    selectedCount: (n: number) => `已选 ${n} 家`,
  },
};

export function PaymentScheduleReports({ language, rows, suppliers }: Props) {
  const t = COPY[language];
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [forecastMonthFilter, setForecastMonthFilter] = useState("all");

  const supplierOptions = useMemo(() => uniqueSuppliersFromRows(rows), [rows]);
  const forecastMonthOptions = useMemo(() => uniqueForecastEntryMonths(rows), [rows]);

  const skuMatrix = useMemo(
    () => buildPaymentScheduleMatrix(rows, suppliers),
    [rows, suppliers],
  );

  const supplierScopedRows = useMemo(
    () => filterRowsForSupplierReport(rows, selectedSuppliers, forecastMonthFilter),
    [rows, selectedSuppliers, forecastMonthFilter],
  );

  const supplierMatrix = useMemo(
    () => buildPaymentScheduleMatrix(supplierScopedRows, suppliers),
    [supplierScopedRows, suppliers],
  );

  const supplierOrder = useMemo(() => {
    const set = new Set(selectedSuppliers);
    return supplierOptions.filter((name) => set.has(name));
  }, [selectedSuppliers, supplierOptions]);

  function toggleSupplier(name: string) {
    setSelectedSuppliers((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  }

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
    supplierSubtotal: t.supplierSubtotal,
  };

  const csvLabels = {
    ...tableLabels,
    forecastMonthCol: t.forecastMonthCol,
  };

  const skuExportable = paymentScheduleMatrixExportable(skuMatrix);
  const supplierExportable =
    selectedSuppliers.length > 0 && paymentScheduleMatrixExportable(supplierMatrix);

  const exportBtnClass =
    "app-button-primary inline-flex shrink-0 items-center justify-center px-4 py-2.5 text-sm font-semibold shadow-md ring-1 ring-[var(--app-accent)]/25 transition hover:shadow-lg disabled:pointer-events-none disabled:opacity-45";

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-app-border/80 bg-app-surface/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h3 className="text-base font-semibold text-foreground">{t.skuSection}</h3>
          <button
            type="button"
            disabled={!skuExportable}
            title={skuExportable ? t.exportCsv : t.exportEmpty}
            onClick={() => exportPaymentScheduleSkuCsv(skuMatrix, language, csvLabels)}
            className={exportBtnClass}
          >
            {t.exportCsv}
          </button>
        </div>
        <details className="mt-1 text-xs text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {language === "en" ? "Notes" : "说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.skuHint}</p>
        </details>
        <PaymentScheduleMatrixTable matrix={skuMatrix} language={language} labels={tableLabels} />
      </section>

      <section className="rounded-2xl border border-app-border/80 bg-app-surface/70 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <h3 className="text-base font-semibold text-foreground">{t.supplierSection}</h3>
          <button
            type="button"
            disabled={!supplierExportable}
            title={supplierExportable ? t.exportCsv : t.exportEmpty}
            onClick={() =>
              exportPaymentScheduleSupplierCsv(
                supplierMatrix,
                language,
                csvLabels,
                forecastMonthFilter,
                supplierOrder,
              )
            }
            className={exportBtnClass}
          >
            {t.exportCsv}
          </button>
        </div>
        <details className="mt-1 text-xs text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {language === "en" ? "Notes" : "说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.supplierHint}</p>
        </details>

        <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
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
          <span className="pb-0.5 text-xs text-app-muted">{t.selectedCount(selectedSuppliers.length)}</span>
        </div>

        <div className="mt-2 rounded-xl border border-app-border/80 bg-app-surface/50 p-3">
          <div className="mb-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-app-border px-2 py-0.5 text-xs hover:bg-app-accent-soft"
              onClick={() => setSelectedSuppliers([...supplierOptions])}
            >
              {t.selectAll}
            </button>
            <button
              type="button"
              className="rounded border border-app-border px-2 py-0.5 text-xs hover:bg-app-accent-soft"
              onClick={() => setSelectedSuppliers([])}
            >
              {t.clearAll}
            </button>
          </div>
          <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
            {supplierOptions.map((name) => (
              <label
                key={name}
                className="flex cursor-pointer items-start gap-2 rounded-md px-1 py-1 hover:bg-app-accent-soft/40"
              >
                <input
                  type="checkbox"
                  className="mt-0.5 shrink-0"
                  checked={selectedSuppliers.includes(name)}
                  onChange={() => toggleSupplier(name)}
                />
                <span className="min-w-0 text-sm leading-snug text-foreground">{name}</span>
              </label>
            ))}
          </div>
        </div>

        {selectedSuppliers.length === 0 ? (
          <p className="mt-3 text-sm text-app-muted">{t.supplierRequired}</p>
        ) : (
          <PaymentScheduleMatrixTable
            matrix={supplierMatrix}
            language={language}
            labels={tableLabels}
            showForecastMonth={forecastMonthFilter === "all"}
            forecastMonthLabel={t.forecastMonthCol}
            groupBySupplier
            supplierOrder={supplierOrder}
          />
        )}
      </section>
    </div>
  );
}
