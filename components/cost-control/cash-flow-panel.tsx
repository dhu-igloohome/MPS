"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { CashFlowDashboard } from "@/components/cost-control/cash-flow-dashboard";
import { formatUsd } from "@/lib/format-usd";
import type { Language } from "@/lib/i18n";
import type {
  ForecastCashFlowRow,
  LogisticsLandedCostConsolidateSnapshot,
  SupplierEntry,
  UnitCostQuoteEntry,
} from "@/lib/types";

type CashFlowPanelProps = {
  language: Language;
  forecastCashFlowRows: ForecastCashFlowRow[];
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

const LABELS = {
  en: {
    fcTitle: "Forecast cash flow",
    fcHint:
      "Only forecast rows whose Comment is \"Ok\" appear here (set on the Forecast page). Pick a supplier per row; Unit price (USD) is the latest matching quote from Unit cost (same SKU + supplier). Landed cost cash flow below follows Logistics → Landed cost consolidate when that PO has been saved there (drafts are created when you open that page).",
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
    fcCreatedAt: "Created At",
    fcActions: "Actions",
    fcComment: "Comment",
    fcOpenForecast: "Open Forecast",
    fcEmpty: "No forecast records in your regions.",
  },
  zh: {
    fcTitle: "Forecast 现金流",
    fcHint:
      "仅显示 Forecast 页面评论（Comment）为 Ok 的行。每行可选供应商；单价 (USD) 取自「单位成本」中该 SKU + 供应商的最新报价。下方的 Landed cost 现金流在「物流进度 → 到岸成本汇总」保存该 PO 后以汇总为准（打开该页会为各 PO 自动生成草稿）。",
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
    fcCreatedAt: "创建日期",
    fcActions: "操作",
    fcComment: "评论",
    fcOpenForecast: "打开 Forecast",
    fcEmpty: "当前区域暂无 forecast 记录。",
  },
};

export function CashFlowPanel({
  language,
  forecastCashFlowRows,
  fcSupplierNames,
  fcSuppliers,
  landedCostConsolidateSnapshots,
  unitCostQuotes,
}: CashFlowPanelProps) {
  const t = LABELS[language];
  const [fcRows, setFcRows] = useState(forecastCashFlowRows);
  const [fcRowSavingId, setFcRowSavingId] = useState<string | null>(null);
  const [fcMessage, setFcMessage] = useState("");

  useEffect(() => {
    setFcRows(forecastCashFlowRows);
  }, [forecastCashFlowRows]);

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
            }
          : r,
      ),
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border/80 bg-app-surface/70 p-4 shadow-sm">
        <h4 className="text-base font-semibold text-foreground">{t.fcTitle}</h4>
        <p className="mt-1 text-xs text-app-muted">{t.fcHint}</p>
        <div className="app-table-shell mt-3 overflow-x-auto">
          <table className="w-full min-w-[1280px] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-app-border/80 bg-app-surface/80 text-left text-app-muted">
                <th className="px-2 py-2">{t.fcMonth}</th>
                <th className="px-2 py-2">{t.fcForecastNo}</th>
                <th className="px-2 py-2">{t.fcRegion}</th>
                <th className="px-2 py-2">{t.fcDestination}</th>
                <th className="px-2 py-2">{t.fcProductName}</th>
                <th className="px-2 py-2">{t.sku}</th>
                <th className="min-w-[10rem] px-2 py-2">{t.fcSupplierName}</th>
                <th className="px-2 py-2">{t.fcUnitPriceUsd}</th>
                <th className="px-2 py-2">{t.fcBto}</th>
                <th className="px-2 py-2">{t.fcBts}</th>
                <th className="px-2 py-2">{t.fcCreatedAt}</th>
                <th className="px-2 py-2">{t.fcActions}</th>
                <th className="px-2 py-2">{t.fcComment}</th>
              </tr>
            </thead>
            <tbody>
              {fcRows.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-2 py-6 text-center text-app-muted">
                    {t.fcEmpty}
                  </td>
                </tr>
              ) : (
                fcRows.map((row) => (
                  <tr key={row.id} className="border-b border-app-border/40">
                    <td className="px-2 py-2 whitespace-nowrap">{formatForecastMonthCell(row.month, language)}</td>
                    <td className="px-2 py-2">{row.poNumber || "—"}</td>
                    <td className="px-2 py-2">{row.region}</td>
                    <td className="max-w-[8rem] break-words px-2 py-2">{row.destination || "—"}</td>
                    <td className="max-w-[10rem] break-words px-2 py-2">{row.productName}</td>
                    <td className="px-2 py-2 font-medium">{row.sku}</td>
                    <td className="px-2 py-2 align-top">
                      <select
                        value={row.cashFlowSupplierName}
                        onChange={(e) => void onFcSupplierChange(row.id, e.target.value)}
                        disabled={fcRowSavingId === row.id}
                        className="w-full max-w-[12rem] rounded-lg border border-app-border bg-app-surface px-2 py-1 text-sm"
                        aria-label={t.fcSupplierName}
                      >
                        <option value="">{t.fcSelectSupplier}</option>
                        {fcSupplierNames.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td
                      className="px-2 py-2 tabular-nums"
                      title={
                        row.cashFlowSupplierName && row.unitPriceUsd == null
                          ? t.fcNoUnitCostHint
                          : undefined
                      }
                    >
                      {!row.cashFlowSupplierName
                        ? "—"
                        : row.unitPriceUsd != null
                          ? formatUsd(row.unitPriceUsd, 4)
                          : t.fcNoUnitCostQuote}
                    </td>
                    <td className="px-2 py-2 tabular-nums">{row.buildToOrder}</td>
                    <td className="px-2 py-2 tabular-nums">{row.buildToStock}</td>
                    <td className="px-2 py-2 whitespace-nowrap tabular-nums">
                      {row.createdAt.slice(0, 10)}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <Link
                        href="/forecast"
                        className="text-app-accent hover:underline"
                        prefetch={false}
                      >
                        {t.fcOpenForecast}
                      </Link>
                    </td>
                    <td className="max-w-[14rem] break-words px-2 py-2 text-app-muted">
                      {row.remark?.trim() ? row.remark : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {fcMessage ? <p className="text-sm text-red-600">{fcMessage}</p> : null}

      <CashFlowDashboard
        language={language}
        entries={[]}
        costAnalysisEntries={[]}
        forecastCashFlowRows={fcRows}
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
