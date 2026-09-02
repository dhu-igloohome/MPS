"use client";

import { useEffect, useMemo, useState } from "react";

import { CashFlowDashboard } from "@/components/supply-chain/cost-control/cash-flow-dashboard";
import { ccLabel, ccSelectSm } from "@/components/shared/field-controls";
import { ForecastCashFlowTable } from "@/components/supply-chain/cost-control/forecast-cash-flow-table";
import type { ForecastContractCoverageSummary } from "@/lib/contract-forecast-coverage";
import type { Language } from "@/lib/i18n";
import type {
  ForecastCashFlowRow,
  ForecastIncoterm,
  LogisticsLandedCostConsolidateSnapshot,
  SupplierEntry,
  UnitCostQuoteEntry,
} from "@/lib/types";

type CashFlowPanelProps = {
  language: Language;
  forecastCashFlowRows: ForecastCashFlowRow[];
  forecastContractCoverage: ForecastContractCoverageSummary;
  /** Active supplier names (Supply Chain → Suppliers) for Forecast cash flow dropdown. */
  fcSupplierNames: string[];
  /** Supplier master data for payment schedule (terms + lead time). */
  fcSuppliers: SupplierEntry[];
  landedCostConsolidateSnapshots: LogisticsLandedCostConsolidateSnapshot[];
  unitCostQuotes: UnitCostQuoteEntry[];
};

function formatForecastMonthCell(ym: string, language: Language): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return ym;
  if (language === "en") {
    return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return `${y}年${mo}月`;
}

function uniqueForecastMonths(rows: ForecastCashFlowRow[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const m = (r.month || "").trim();
    if (m) set.add(m);
  }
  return [...set].sort((a, b) => b.localeCompare(a));
}

function filterForecastCashFlowByMonth(
  rows: ForecastCashFlowRow[],
  monthFilter: string,
): ForecastCashFlowRow[] {
  if (monthFilter === "all") return rows;
  return rows.filter((r) => (r.month || "").trim() === monthFilter);
}

function csvEscape(cell: string): string {
  const s = String(cell ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportForecastCashFlowReport(rows: ForecastCashFlowRow[], language: Language, t: (typeof LABELS)["en"]) {
  const sep = ",";
  const header = [
    t.fcMonth,
    t.fcForecastNo,
    t.fcRegion,
    t.fcDestination,
    t.fcProductName,
    t.sku,
    t.fcSupplierName,
    t.fcUnitPriceUsd,
    t.fcBto,
    t.fcBts,
    t.fcCreatedAt,
    t.fcOpsActionCol,
    t.fcComment,
  ];
  const lines = [header.map(csvEscape).join(sep)];
  for (const row of rows) {
    const monthCell = formatForecastMonthCell(row.month, language);
    const unitUsd =
      !row.cashFlowSupplierName.trim()
        ? ""
        : row.unitPriceUsd != null
          ? String(row.unitPriceUsd)
          : t.fcNoUnitCostQuote;
    lines.push(
      [
        monthCell,
        row.poNumber || "—",
        row.region,
        row.destination || "—",
        row.productName,
        row.sku,
        row.cashFlowSupplierName.trim(),
        unitUsd,
        String(row.buildToOrder),
        String(row.buildToStock),
        row.createdAt.slice(0, 10),
        row.opsAction || "—",
        row.remark?.trim() ? row.remark : "—",
      ]
        .map((c) => csvEscape(String(c)))
        .join(sep),
    );
  }
  const body = `\uFEFF${lines.join("\r\n")}`;
  const stamp = new Date().toISOString().slice(0, 10);
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `forecast-cash-flow-${stamp}.csv`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const LABELS = {
  en: {
    fcTitle: "Forecast cash flow",
    fcHint:
      "Only forecast rows whose Comment is \"Ok\" appear here (set on the Forecast page). Pick a supplier per row; Unit price (USD) is the latest matching quote from Unit cost (same SKU + supplier). Landed cost cash flow below lists only rows you publish from Logistics → Landed cost consolidate using Save next to Landed cost (USD).",
    fcSupplierName: "Supplier name",
    fcUnitPriceUsd: "Unit price (USD)",
    fcSelectSupplier: "Select supplier…",
    fcNoUnitCostQuote: "—",
    fcNoUnitCostHint: "No Unit cost quote",
    fcMonth: "Forecast Month",
    fcForecastNo: "Forecast #",
    fcRegion: "Region",
    fcDestination: "Destination",
    fcProductName: "Product Name",
    sku: "SKU",
    fcBto: "Build to Order",
    fcBts: "Build to Stock",
    fcDeposit: "Deposit due",
    fcBalance: "Balance due",
    fcCreatedAt: "Created At",
    fcActions: "Actions",
    fcComment: "Comment",
    fcOpenForecast: "Open Forecast",
    fcEmpty: "No forecast records in your regions.",
    fcExportReport: "Export Forecast cash flow report",
    fcExportEmpty: "No rows to export",
    fcOpsActionCol: "Ops action",
    fcCoverageCol: "Pending contract",
    fcCreateContract: "Create contract",
    fcFilterPending: "Only SKUs with pending contract qty",
    fcRowRemaining: "Remaining",
    fcFilterByMonth: "Forecast month",
    fcAllMonths: "All months",
  },
  zh: {
    fcTitle: "Forecast 现金流",
    fcHint:
      "仅显示 Forecast 页面评论（Comment）为 Ok 的行。每行可选供应商；单价 (USD) 取自「单位成本」中该 SKU + 供应商的最新报价。下方 Landed cost 现金流仅包含您在「物流进度 → 到岸成本汇总」中对「到岸成本 (USD)」右侧点击「保存」后发布的行。",
    fcSupplierName: "供应商名称",
    fcUnitPriceUsd: "单价 (USD)",
    fcSelectSupplier: "选择供应商…",
    fcNoUnitCostQuote: "—",
    fcNoUnitCostHint: "无单位成本报价",
    fcMonth: "Forecast 月份",
    fcForecastNo: "Forecast #",
    fcRegion: "区域",
    fcDestination: "Destination",
    fcProductName: "产品名称",
    sku: "SKU",
    fcBto: "按单生产",
    fcBts: "备货生产",
    fcDeposit: "订金应付",
    fcBalance: "尾款应付",
    fcCreatedAt: "创建日期",
    fcActions: "操作",
    fcComment: "评论",
    fcOpenForecast: "打开 Forecast",
    fcEmpty: "当前区域暂无 forecast 记录。",
    fcExportReport: "导出 Forecast 现金流报表",
    fcExportEmpty: "没有可导出的行",
    fcOpsActionCol: "运营操作",
    fcCoverageCol: "待建合同",
    fcCreateContract: "创建合同",
    fcFilterPending: "仅显示待建合同 SKU",
    fcRowRemaining: "待建",
    fcFilterByMonth: "Forecast 月份",
    fcAllMonths: "全部月份",
  },
};

export function CashFlowPanel({
  language,
  forecastCashFlowRows,
  forecastContractCoverage,
  fcSupplierNames,
  fcSuppliers,
  landedCostConsolidateSnapshots,
  unitCostQuotes,
}: CashFlowPanelProps) {
  const t = LABELS[language];
  const [fcRows, setFcRows] = useState(forecastCashFlowRows);
  const [fcMonthFilter, setFcMonthFilter] = useState("all");
  const [fcRowSavingId, setFcRowSavingId] = useState<string | null>(null);
  const [fcMessage, setFcMessage] = useState("");

  const fcMonthOptions = useMemo(() => uniqueForecastMonths(fcRows), [fcRows]);

  const visibleFcRows = useMemo(
    () => filterForecastCashFlowByMonth(fcRows, fcMonthFilter),
    [fcRows, fcMonthFilter],
  );

  useEffect(() => {
    setFcRows(forecastCashFlowRows);
  }, [forecastCashFlowRows]);

  useEffect(() => {
    if (fcMonthFilter === "all") return;
    if (!fcMonthOptions.includes(fcMonthFilter)) setFcMonthFilter("all");
  }, [fcMonthFilter, fcMonthOptions]);

  async function onFcSupplierChange(forecastId: string, supplierName: string) {
    setFcRowSavingId(forecastId);
    setFcMessage("");
    const res = await fetch("/api/cost-control/forecast-cash-flow", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ forecastId, supplierName }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      unitPriceUsd?: number | null;
      supplierName?: string;
      poIssueDate?: string | null;
      shippingMode?: ForecastCashFlowRow["cashFlowShippingMode"];
      latestUnitCostQuote?: UnitCostQuoteEntry | null;
      destinationTariffPct?: number | null;
      freightUsdPerUnit?: number | null;
      cashFlowIncoterm?: ForecastIncoterm | null;
      landedCostCashFlowPublishedAt?: string | null;
    };
    setFcRowSavingId(null);
    if (!res.ok) {
      setFcMessage(
        data.message ||
          (language === "en" ? "Could not save supplier for this forecast row." : "保存该行的供应商失败。"),
      );
      return;
    }
    const savedSupplier = data.supplierName ?? supplierName;
    setFcRows((prev) =>
      prev.map((r) =>
        r.id === forecastId
          ? {
              ...r,
              cashFlowSupplierName: savedSupplier,
              unitPriceUsd: data.unitPriceUsd ?? null,
              poIssueDate: data.poIssueDate !== undefined ? data.poIssueDate : r.poIssueDate,
              cashFlowShippingMode: data.shippingMode === "air" ? "air" : "ocean",
              latestUnitCostQuote: data.latestUnitCostQuote ?? r.latestUnitCostQuote,
              cashFlowDestinationTariffPct:
                data.destinationTariffPct !== undefined ? data.destinationTariffPct : r.cashFlowDestinationTariffPct,
              cashFlowFreightUsdPerUnit:
                data.freightUsdPerUnit !== undefined ? data.freightUsdPerUnit : r.cashFlowFreightUsdPerUnit,
              cashFlowIncoterm: data.cashFlowIncoterm !== undefined ? data.cashFlowIncoterm : r.cashFlowIncoterm,
              landedCostCashFlowPublishedAt:
                data.landedCostCashFlowPublishedAt !== undefined
                  ? data.landedCostCashFlowPublishedAt
                  : r.landedCostCashFlowPublishedAt,
            }
          : r,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border/80 bg-app-surface/70 p-4 shadow-sm">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
          <h4 className="min-w-0 text-base font-semibold text-foreground sm:pb-0.5">{t.fcTitle}</h4>
          <div className="flex shrink-0 flex-wrap items-end justify-end gap-x-3 gap-y-2">
            <label className="shrink-0">
              <span className={ccLabel}>{t.fcFilterByMonth}</span>
              <select
                className={ccSelectSm}
                value={fcMonthFilter}
                onChange={(e) => setFcMonthFilter(e.target.value)}
                aria-label={t.fcFilterByMonth}
              >
                <option value="all">{t.fcAllMonths}</option>
                {fcMonthOptions.map((ym) => (
                  <option key={ym} value={ym}>
                    {formatForecastMonthCell(ym, language)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={visibleFcRows.length === 0}
              title={visibleFcRows.length === 0 ? t.fcExportEmpty : t.fcExportReport}
              onClick={() => exportForecastCashFlowReport(visibleFcRows, language, t)}
              className="app-button-primary inline-flex shrink-0 items-center justify-center px-4 py-2.5 text-sm font-semibold shadow-md ring-1 ring-[var(--app-accent)]/25 transition hover:shadow-lg disabled:pointer-events-none disabled:opacity-45"
            >
              {t.fcExportReport}
            </button>
          </div>
        </div>
        <details className="mt-1 text-xs text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {language === "en" ? "Forecast cash flow notes" : "Forecast 现金流说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.fcHint}</p>
        </details>
        <ForecastCashFlowTable
          language={language}
          rows={visibleFcRows}
          coverage={forecastContractCoverage}
          fcSupplierNames={fcSupplierNames}
          suppliers={fcSuppliers}
          labels={t}
          formatMonth={(ym) => formatForecastMonthCell(ym, language)}
          onSupplierChange={(forecastId, supplierName) => void onFcSupplierChange(forecastId, supplierName)}
          rowSavingId={fcRowSavingId}
        />
      </section>

      {fcMessage ? <p className="text-sm text-red-600">{fcMessage}</p> : null}

      <CashFlowDashboard
        language={language}
        entries={[]}
        costAnalysisEntries={[]}
        forecastCashFlowRows={visibleFcRows}
        landedCostConsolidateSnapshots={landedCostConsolidateSnapshots}
        unitCostQuotes={unitCostQuotes}
        fcSuppliers={fcSuppliers}
        showForecastCashFlowSummary
        forecastSummaryOnly
        onForecastCashFlowSettingsSaved={(forecastId, payload) => {
          setFcRows((prev) =>
            prev.map((r) =>
              r.id === forecastId
                ? {
                    ...r,
                    cashFlowSupplierName: payload.supplierName,
                    unitPriceUsd: payload.unitPriceUsd,
                    poIssueDate: payload.poIssueDate,
                    cashFlowShippingMode: payload.shippingMode,
                    latestUnitCostQuote: payload.latestUnitCostQuote,
                    cashFlowDestinationTariffPct: payload.destinationTariffPct,
                    cashFlowFreightUsdPerUnit: payload.freightUsdPerUnit,
                    cashFlowIncoterm: payload.cashFlowIncoterm,
                    landedCostCashFlowPublishedAt: payload.landedCostCashFlowPublishedAt,
                  }
                : r,
            ),
          );
        }}
        onForecastCashFlowSettingsError={(msg) => setFcMessage(msg)}
      />
    </div>
  );
}
