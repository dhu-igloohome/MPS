"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { CreateContractFromForecastModal } from "@/components/contract/create-contract-from-forecast-modal";
import {
  formatScheduleMonth,
  resolveForecastRowPayment,
} from "@/lib/forecast-supplier-payment-schedule";
import { buildSupplierTermsIndex } from "@/lib/supplier-name-lookup";
import { formatUsd } from "@/lib/format-usd";
import type { ForecastContractCoverageSummary } from "@/lib/contract-forecast-coverage";
import type { Language } from "@/lib/i18n";
import type { ForecastCashFlowRow, SupplierEntry } from "@/lib/types";

type Labels = {
  fcMonth: string;
  fcForecastNo: string;
  fcRegion: string;
  fcDestination: string;
  fcProductName: string;
  sku: string;
  fcSupplierName: string;
  fcUnitPriceUsd: string;
  fcSelectSupplier: string;
  fcNoUnitCostQuote: string;
  fcNoUnitCostHint: string;
  fcBto: string;
  fcBts: string;
  fcDeposit: string;
  fcBalance: string;
  fcCreatedAt: string;
  fcActions: string;
  fcComment: string;
  fcOpenForecast: string;
  fcEmpty: string;
  fcCoverageCol: string;
  fcCreateContract: string;
  fcFilterPending: string;
  fcRowRemaining: string;
};

type ForecastCashFlowTableProps = {
  language: Language;
  rows: ForecastCashFlowRow[];
  coverage: ForecastContractCoverageSummary;
  fcSupplierNames: string[];
  suppliers: SupplierEntry[];
  labels: Labels;
  formatMonth: (ym: string) => string;
  onSupplierChange: (forecastId: string, supplierName: string) => void;
  rowSavingId: string | null;
};

export function ForecastCashFlowTable({
  language,
  rows,
  coverage,
  fcSupplierNames,
  suppliers,
  labels,
  formatMonth,
  onSupplierChange,
  rowSavingId,
}: ForecastCashFlowTableProps) {
  const router = useRouter();
  const en = language === "en";
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);
  const [expandedSkus, setExpandedSkus] = useState<Set<string>>(() => new Set());
  const [modalSku, setModalSku] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, ForecastCashFlowRow[]>();
    for (const r of rows) {
      const k = r.sku.trim() || "—";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return [...map.entries()]
      .map(([sku, lineRows]) => ({
        sku,
        lineRows,
        cov: coverage.bySku[sku],
      }))
      .filter((g) => !filterPendingOnly || (g.cov?.remainingQty ?? 0) > 0)
      .sort((a, b) => a.sku.localeCompare(b.sku));
  }, [rows, coverage.bySku, filterPendingOnly]);

  const modalGroup = modalSku ? groups.find((g) => g.sku === modalSku) : null;
  const modalSupplier =
    modalGroup?.lineRows.map((r) => r.cashFlowSupplierName.trim()).find(Boolean) ?? "";

  const supplierTermsIndex = useMemo(() => buildSupplierTermsIndex(suppliers), [suppliers]);
  const monthLang = language === "en" ? "en" : "zh";

  const diagnostics = useMemo(() => {
    let total = 0;
    let missingSupplier = 0;
    let unknownSupplier = 0;
    let missingPoDate = 0;
    let missingUnitCost = 0;
    let parseFailed = 0;
    let schedulable = 0;

    for (const r of rows) {
      total += 1;
      const hasSupplier = Boolean(r.cashFlowSupplierName.trim());
      if (!hasSupplier) {
        missingSupplier += 1;
        continue;
      }
      const { lineTotal, schedule, unknownSupplier: unk } = resolveForecastRowPayment(
        r,
        suppliers,
        supplierTermsIndex,
      );
      if (unk) {
        unknownSupplier += 1;
        continue;
      }
      if (!r.poIssueDate) {
        missingPoDate += 1;
        continue;
      }
      if (lineTotal == null) {
        missingUnitCost += 1;
        continue;
      }
      if (schedule?.parseFailed) {
        parseFailed += 1;
        continue;
      }
      if (schedule?.deposit || schedule?.balance) {
        schedulable += 1;
      }
    }
    return { total, missingSupplier, unknownSupplier, missingPoDate, missingUnitCost, parseFailed, schedulable };
  }, [rows, suppliers, supplierTermsIndex]);

  function toggleSku(sku: string) {
    setExpandedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku);
      else next.add(sku);
      return next;
    });
  }

  function renderDataRow(row: ForecastCashFlowRow, skuCov: (typeof groups)[0]["cov"]) {
    const rowCov = skuCov?.rows.find((r) => r.forecastId === row.id);
    const { lineTotal, schedule, supMeta, unknownSupplier } = resolveForecastRowPayment(
      row,
      suppliers,
      supplierTermsIndex,
    );
    return (
      <tr key={row.id} className="border-b border-app-border/40 bg-app-surface/30">
        <td className="px-2 py-2 whitespace-nowrap pl-6">{formatMonth(row.month)}</td>
        <td className="px-2 py-2">{row.poNumber || "—"}</td>
        <td className="px-2 py-2">{row.region}</td>
        <td className="max-w-[8rem] break-words px-2 py-2">{row.destination || "—"}</td>
        <td className="max-w-[10rem] break-words px-2 py-2">{row.productName}</td>
        <td className="px-2 py-2 font-medium text-app-muted">{row.sku}</td>
        <td className="px-2 py-2 align-top">
          <select
            value={row.cashFlowSupplierName}
            onChange={(e) => onSupplierChange(row.id, e.target.value)}
            disabled={rowSavingId === row.id}
            className="app-control-md max-w-[11rem] rounded-lg border border-app-border bg-app-surface px-2 py-1 text-sm"
            aria-label={labels.fcSupplierName}
          >
            <option value="">{labels.fcSelectSupplier}</option>
            {fcSupplierNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </td>
        <td
          className="px-2 py-2 tabular-nums"
          title={row.cashFlowSupplierName && row.unitPriceUsd == null ? labels.fcNoUnitCostHint : undefined}
        >
          {!row.cashFlowSupplierName
            ? "—"
            : row.unitPriceUsd != null
              ? formatUsd(row.unitPriceUsd, 4)
              : labels.fcNoUnitCostQuote}
        </td>
        <td className="px-2 py-2 tabular-nums">{row.buildToOrder}</td>
        <td className="px-2 py-2 tabular-nums">{row.buildToStock}</td>
        <td className="min-w-[7.5rem] px-2 py-2 align-top">
          {lineTotal == null || !row.poIssueDate || !row.cashFlowSupplierName.trim() ? (
            <span className="text-app-muted">—</span>
          ) : unknownSupplier ? (
            <span className="text-app-muted" title={en ? "Supplier not in master list" : "供应商未在档案中匹配"}>
              —
            </span>
          ) : schedule?.parseFailed ? (
            <span className="cursor-help text-app-muted" title={supMeta?.paymentTerms || ""}>
              —
            </span>
          ) : schedule?.deposit ? (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="whitespace-nowrap font-medium text-foreground">
                {formatScheduleMonth(schedule.deposit.dateYmd, monthLang)}
              </span>
              <span className="tabular-nums text-app-muted">{formatUsd(schedule.deposit.amountUsd, 2)}</span>
            </div>
          ) : (
            <span className="text-app-muted">—</span>
          )}
        </td>
        <td className="min-w-[7.5rem] px-2 py-2 align-top">
          {lineTotal == null || !row.poIssueDate || !row.cashFlowSupplierName.trim() ? (
            <span className="text-app-muted">—</span>
          ) : unknownSupplier ? (
            <span className="text-app-muted" title={en ? "Supplier not in master list" : "供应商未在档案中匹配"}>
              —
            </span>
          ) : schedule?.parseFailed ? (
            <span className="cursor-help text-app-muted" title={supMeta?.paymentTerms || ""}>
              —
            </span>
          ) : schedule?.balance ? (
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="whitespace-nowrap font-medium text-foreground">
                {formatScheduleMonth(schedule.balance.dateYmd, monthLang)}
              </span>
              <span className="tabular-nums text-app-muted">{formatUsd(schedule.balance.amountUsd, 2)}</span>
            </div>
          ) : (
            <span className="text-app-muted">—</span>
          )}
        </td>
        <td className="px-2 py-2 whitespace-nowrap tabular-nums text-xs text-app-muted">
          {row.createdAt.slice(0, 10)}
        </td>
        <td className="px-2 py-2 text-xs tabular-nums">
          {rowCov ? (
            <span className={rowCov.remainingQty > 0 ? "font-medium text-amber-700" : "text-emerald-700"}>
              {labels.fcRowRemaining}: {rowCov.remainingQty}
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="px-2 py-2 whitespace-nowrap">
          <Link href="/forecast" className="text-app-accent hover:underline" prefetch={false}>
            {labels.fcOpenForecast}
          </Link>
        </td>
        <td className="max-w-[14rem] break-words px-2 py-2 text-app-muted">
          {row.remark?.trim() ? row.remark : "—"}
        </td>
      </tr>
    );
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={filterPendingOnly}
            onChange={(e) => setFilterPendingOnly(e.target.checked)}
            className="rounded border-app-border"
          />
          {labels.fcFilterPending}
        </label>
      </div>
      {diagnostics.total > 0 && diagnostics.schedulable === 0 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">
            {en ? "No scheduled payments can be computed yet." : "当前无法计算任何订金/尾款应付。"}
          </p>
          <ul className="mt-2 grid gap-1 text-xs text-amber-800 sm:grid-cols-2 lg:grid-cols-3">
            <li>
              {en ? "Missing supplier" : "未选供应商"}: {diagnostics.missingSupplier}
            </li>
            <li>
              {en ? "Supplier not in master" : "供应商未匹配到档案"}: {diagnostics.unknownSupplier}
            </li>
            <li>
              {en ? "Missing PO issue date" : "缺少 PO 下达日"}: {diagnostics.missingPoDate}
            </li>
            <li>
              {en ? "Missing unit cost quote" : "缺少单位成本报价"}: {diagnostics.missingUnitCost}
            </li>
            <li>
              {en ? "Unparseable payment terms" : "付款条款无法解析"}: {diagnostics.parseFailed}
            </li>
          </ul>
          <p className="mt-2 text-xs text-amber-800">
            {en
              ? "Fix: pick Supplier name, ensure Unit cost has a quote for SKU + supplier, set PO issue date, and ensure supplier Payment terms is parseable."
              : "处理方式：选择供应商；确保「单位成本」存在该 SKU+供应商报价；填写 PO 下达日；并在「供应商」中把 Payment terms 写成可解析格式。"}
          </p>
        </div>
      ) : null}
      <div className="app-table-shell mt-3 overflow-x-auto">
        <table className="w-full min-w-[1400px] border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-app-border/80 bg-app-surface/80 text-left text-app-muted">
              <th className="px-2 py-2">{labels.fcMonth}</th>
              <th className="px-2 py-2">{labels.fcForecastNo}</th>
              <th className="px-2 py-2">{labels.fcRegion}</th>
              <th className="px-2 py-2">{labels.fcDestination}</th>
              <th className="px-2 py-2">{labels.fcProductName}</th>
              <th className="px-2 py-2">{labels.sku}</th>
              <th className="min-w-[10rem] px-2 py-2">{labels.fcSupplierName}</th>
              <th className="px-2 py-2">{labels.fcUnitPriceUsd}</th>
              <th className="px-2 py-2">{labels.fcBto}</th>
              <th className="px-2 py-2">{labels.fcBts}</th>
              <th className="px-2 py-2">{labels.fcDeposit}</th>
              <th className="px-2 py-2">{labels.fcBalance}</th>
              <th className="px-2 py-2">{labels.fcCreatedAt}</th>
              <th className="px-2 py-2">{labels.fcCoverageCol}</th>
              <th className="px-2 py-2">{labels.fcActions}</th>
              <th className="px-2 py-2">{labels.fcComment}</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-2 py-6 text-center text-app-muted">
                  {labels.fcEmpty}
                </td>
              </tr>
            ) : (
              groups.map(({ sku, lineRows, cov }) => {
                const expanded = expandedSkus.has(sku);
                const remaining = cov?.remainingQty ?? 0;
                const canCreate = remaining > 0;
                const supplierForSku = lineRows.map((r) => r.cashFlowSupplierName.trim()).find(Boolean) ?? "";
                return (
                  <Fragment key={`sku-${sku}`}>
                    <tr className="border-b border-app-border/60 bg-slate-50/90 dark:bg-slate-800/50">
                      <td colSpan={5} className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => toggleSku(sku)}
                          className="mr-2 text-app-muted hover:text-foreground"
                          aria-expanded={expanded}
                        >
                          {expanded ? "▼" : "▶"}
                        </button>
                        <span className="font-semibold text-foreground">{sku}</span>
                        <span className="ml-2 text-xs text-app-muted">
                          ({lineRows.length} {en ? "lines" : "行"})
                        </span>
                      </td>
                      <td colSpan={6} className="px-2 py-2 text-xs tabular-nums">
                        {cov ? (
                          <>
                            <span className={remaining > 0 ? "font-medium text-amber-700" : "text-emerald-700"}>
                              {en ? "Remaining" : "待建"}: {remaining} / {cov.forecastQty}
                            </span>
                            {cov.remainingAmountUsd > 0 ? (
                              <span className="ml-2 text-app-muted">
                                (~{formatUsd(cov.remainingAmountUsd, 0)} USD)
                              </span>
                            ) : null}
                          </>
                        ) : null}
                      </td>
                      <td colSpan={2} className="px-2 py-2">
                        <button
                          type="button"
                          disabled={!canCreate || !cov}
                          onClick={() => setModalSku(sku)}
                          className="rounded-lg bg-app-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
                        >
                          {labels.fcCreateContract}
                        </button>
                      </td>
                      <td colSpan={3} className="px-2 py-2 text-xs text-app-muted">
                        {supplierForSku || (en ? "Select supplier on lines" : "请先在行上选择供应商")}
                      </td>
                    </tr>
                    {expanded ? lineRows.map((row) => renderDataRow(row, cov)) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {toast ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
          {toast}
        </p>
      ) : null}

      {modalGroup && modalGroup.cov ? (
        <CreateContractFromForecastModal
          language={language}
          sku={modalSku!}
          defaultSupplier1Name={modalSupplier}
          coverage={modalGroup.cov}
          suppliers={suppliers}
          onClose={() => setModalSku(null)}
          onCreated={(msg) => {
            setToast(msg);
            setModalSku(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}
