"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CashFlowDashboard } from "@/components/cost-control/cash-flow-dashboard";
import { findCostAnalysisForCashFlow } from "@/lib/cash-flow-cost-analysis-link";
import { formatUsd } from "@/lib/format-usd";
import { computeCashFlowDerivedActuals, computeTotalAmount } from "@/lib/cash-flow-validation";
import type { Language } from "@/lib/i18n";
import type { CashFlowEntry, CostAnalysisEntry, ForecastEntry } from "@/lib/types";

type CashFlowPanelProps = {
  language: Language;
  initialEntries: CashFlowEntry[];
  costAnalysisEntries: CostAnalysisEntry[];
  /** Same source as Forecast → All Forecast Records (session regions). */
  forecastRecords: ForecastEntry[];
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
    tableHint:
      "Link to Cost analysis: pick an order line; Qty = Cost analysis Order qty; unit price = that row's unit cost (incl. tariff). Total = qty × unit price. Advance % + final % = 100%. Actual advance date = order date + 7 calendar days; actual final date = that date + term days; actual final amount = total − actual advance.",
    add: "PO cash flow",
    save: "Save",
    cancel: "Cancel edit",
    edit: "Edit",
    delete: "Delete",
    sku: "SKU",
    orderDate: "Order date",
    qty: "Qty",
    qtyHint: "Same as Cost analysis Order qty",
    orderNo: "Order no.",
    pickCostLine: "Cost analysis line (order no. · SKU · supplier)",
    unitPrice: "Unit price (incl. tariff)",
    unitPriceHint: "From Cost analysis",
    noCostData: "No cost analysis rows. Add them in the Cost analysis tab first.",
    orphanEdit: "This row no longer matches Cost analysis. Re-select a line below.",
    pickRequired: "Select a Cost analysis line.",
    unitPriceReadOnly: "Locked to Cost analysis",
    total: "Total",
    advPct: "Advance %",
    termDays: "Term days",
    finPct: "Final %",
    actAdvDate: "Actual advance date",
    actAdvAmt: "Actual advance amt",
    actFinDate: "Actual final date",
    actFinAmt: "Actual final amt",
    remark: "Remark",
    expectedAdv: "Expected advance",
    expectedFin: "Expected final",
    fcTitle: "Forecast cash flow",
    fcHint:
      "Linked from Forecast Input → All Forecast Records (read-only). Comments and edits apply on the Forecast page.",
    fcMonth: "Forecast Month",
    fcForecastNo: "Forecast #",
    fcRegion: "Region",
    fcDestination: "Destination",
    fcProductName: "Product Name",
    fcBto: "Build to Order",
    fcBts: "Build to Stock",
    fcCreatedAt: "Created At",
    fcActions: "Actions",
    fcComment: "Comment",
    fcOpenForecast: "Open Forecast",
    fcEmpty: "No forecast records in your regions.",
  },
  zh: {
    tableHint:
      "与成本分析强关联：先选择成本分析订单行；数量 = 成本分析「订单数量」；单价 = 该行 unit cost（含 tariff）；订单总金额 = 数量 × 单价；预付% + 尾款% = 100%。实际预付日 = 下单日期 + 7 个自然日；实际尾款日 = 实际预付日 + 账期天数；实际尾款金额 = 订单总金额 − 实际预付金额。",
    add: "PO 现金流",
    save: "保存",
    cancel: "取消编辑",
    edit: "编辑",
    delete: "删除",
    sku: "SKU",
    orderDate: "下单日期",
    qty: "订单数量",
    qtyHint: "与成本分析订单数量一致",
    orderNo: "订单号",
    pickCostLine: "成本分析订单行（订单号 · SKU · 供应商）",
    unitPrice: "单价（含 tariff，来自成本分析）",
    unitPriceHint: "与成本分析一致",
    noCostData: "暂无成本分析数据，请先在「成本分析」中录入。",
    orphanEdit: "此行与成本分析不匹配，请在下方重新选择订单行。",
    pickRequired: "请选择成本分析订单行。",
    unitPriceReadOnly: "随成本分析锁定",
    total: "订单总金额",
    advPct: "预付款比例 %",
    termDays: "账期天数",
    finPct: "尾款比例 %",
    actAdvDate: "实际预付款日期",
    actAdvAmt: "实际预付款金额",
    actFinDate: "实际支付尾款日期",
    actFinAmt: "实际支付尾款金额",
    remark: "备注",
    expectedAdv: "按比例应付预付",
    expectedFin: "按比例应付尾款",
    fcTitle: "Forecast 现金流",
    fcHint:
      "与 Forecast 填报 →「全部 Forecast 记录」字段一致（只读同步）。评论与修改请在 Forecast 页面操作。",
    fcMonth: "Forecast 月份",
    fcForecastNo: "Forecast #",
    fcRegion: "区域",
    fcDestination: "Destination",
    fcProductName: "产品名称",
    fcBto: "按单生产",
    fcBts: "备货生产",
    fcCreatedAt: "创建日期",
    fcActions: "操作",
    fcComment: "评论",
    fcOpenForecast: "打开 Forecast",
    fcEmpty: "当前区域暂无 forecast 记录。",
  },
};

function emptyForm(): Omit<CashFlowEntry, "id" | "createdBy" | "createdAt" | "updatedAt"> {
  return {
    sku: "",
    orderDate: new Date().toISOString().slice(0, 10),
    quantity: 0,
    orderNumber: "",
    unitPrice: 0,
    totalAmount: 0,
    advanceRatioPct: 30,
    paymentTermDays: 75,
    finalRatioPct: 70,
    actualAdvanceDate: null,
    actualAdvanceAmount: null,
    actualFinalDate: null,
    actualFinalAmount: null,
    remarks: "",
  };
}

export function CashFlowPanel({
  language,
  initialEntries,
  costAnalysisEntries,
  forecastRecords,
}: CashFlowPanelProps) {
  const router = useRouter();
  const t = LABELS[language];
  const [entries, setEntries] = useState(initialEntries);
  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(() => emptyForm());

  const selectedCostLineId = useMemo(
    () => findCostAnalysisForCashFlow(costAnalysisEntries, form.orderNumber, form.sku)?.id ?? "",
    [costAnalysisEntries, form.orderNumber, form.sku],
  );
  const matchedCostRow = useMemo(
    () => findCostAnalysisForCashFlow(costAnalysisEntries, form.orderNumber, form.sku),
    [costAnalysisEntries, form.orderNumber, form.sku],
  );

  const expectedAdv = useMemo(
    () => (form.totalAmount * form.advanceRatioPct) / 100,
    [form.totalAmount, form.advanceRatioPct],
  );
  const expectedFin = useMemo(
    () => (form.totalAmount * form.finalRatioPct) / 100,
    [form.totalAmount, form.finalRatioPct],
  );

  const derivedActuals = useMemo(
    () =>
      computeCashFlowDerivedActuals(
        form.orderDate,
        form.paymentTermDays,
        form.totalAmount,
        form.actualAdvanceAmount,
      ),
    [form.orderDate, form.paymentTermDays, form.totalAmount, form.actualAdvanceAmount],
  );

  function fillFromEntry(e: CashFlowEntry) {
    setEditingId(e.id);
    const ca = findCostAnalysisForCashFlow(costAnalysisEntries, e.orderNumber, e.sku);
    const qty = ca ? ca.quantity : e.quantity;
    const unit = ca ? ca.unitCostWithTariff : e.unitPrice;
    setForm({
      sku: e.sku,
      orderDate: e.orderDate,
      quantity: qty,
      orderNumber: e.orderNumber,
      unitPrice: unit,
      totalAmount: computeTotalAmount(qty, unit),
      advanceRatioPct: e.advanceRatioPct,
      paymentTermDays: e.paymentTermDays,
      finalRatioPct: e.finalRatioPct,
      actualAdvanceDate: null,
      actualAdvanceAmount: e.actualAdvanceAmount,
      actualFinalDate: null,
      actualFinalAmount: null,
      remarks: e.remarks,
    });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyForm());
    setMessage("");
  }

  async function refresh() {
    const res = await fetch("/api/cost-control/cash-flow");
    const data = (await res.json()) as { entries?: CashFlowEntry[] };
    if (data.entries) setEntries(data.entries);
    router.refresh();
  }

  useEffect(() => {
    if (!matchedCostRow) return;
    setForm((f) => {
      const q = matchedCostRow.quantity;
      const total = computeTotalAmount(q, f.unitPrice);
      if (f.quantity === q && f.totalAmount === total) return f;
      return { ...f, quantity: q, totalAmount: total };
    });
  }, [matchedCostRow?.id, matchedCostRow?.quantity]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const ca = findCostAnalysisForCashFlow(costAnalysisEntries, form.orderNumber, form.sku);
    if (!ca) {
      setLoading(false);
      setMessage(t.pickRequired);
      return;
    }
    if (Math.abs(form.unitPrice - ca.unitCostWithTariff) > 0.02) {
      setLoading(false);
      setMessage(
        language === "en"
          ? "Unit price must match Cost analysis unit cost (incl. tariff) for this line."
          : "单价须与成本分析该行「unit cost（含 tariff）」一致。",
      );
      return;
    }
    if (Number(form.quantity) !== Number(ca.quantity)) {
      setLoading(false);
      setMessage(
        language === "en"
          ? "Qty must equal Order qty in Cost analysis for this line."
          : "数量须与成本分析该行「订单数量」一致。",
      );
      return;
    }
    const payload = {
      sku: form.sku,
      orderDate: form.orderDate,
      quantity: form.quantity,
      orderNumber: form.orderNumber,
      unitPrice: form.unitPrice,
      totalAmount: form.totalAmount,
      advanceRatioPct: form.advanceRatioPct,
      paymentTermDays: form.paymentTermDays,
      finalRatioPct: form.finalRatioPct,
      actualAdvanceDate: derivedActuals.actualAdvanceDate,
      actualAdvanceAmount: form.actualAdvanceAmount,
      actualFinalDate: derivedActuals.actualFinalDate,
      actualFinalAmount: derivedActuals.actualFinalAmount,
      remarks: form.remarks,
    };
    const res = editingId
      ? await fetch(`/api/cost-control/cash-flow/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/cost-control/cash-flow", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || "Request failed");
      return;
    }
    reset();
    await refresh();
  }

  async function onDelete(id: string) {
    if (!confirm(language === "en" ? "Delete this row?" : "确定删除此行？")) return;
    setLoading(true);
    const res = await fetch(`/api/cost-control/cash-flow/${encodeURIComponent(id)}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setMessage(data.message || "Delete failed");
      return;
    }
    if (editingId === id) reset();
    await refresh();
  }

  const inputBase =
    "mt-1 w-full rounded-lg border border-app-border px-2 py-1.5 text-sm text-foreground";
  const readOnlyMuted = `${inputBase} cursor-not-allowed bg-app-muted/25`;
  const moneyInputBase =
    "w-full rounded-lg border border-app-border py-1.5 pr-2 pl-6 text-sm text-foreground";

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border/80 bg-app-surface/70 p-4 shadow-sm">
        <h4 className="text-base font-semibold text-foreground">{t.fcTitle}</h4>
        <p className="mt-1 text-xs text-app-muted">{t.fcHint}</p>
        <div className="app-table-shell mt-3 overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-app-border/80 bg-app-surface/80 text-left text-app-muted">
                <th className="px-2 py-2">{t.fcMonth}</th>
                <th className="px-2 py-2">{t.fcForecastNo}</th>
                <th className="px-2 py-2">{t.fcRegion}</th>
                <th className="px-2 py-2">{t.fcDestination}</th>
                <th className="px-2 py-2">{t.fcProductName}</th>
                <th className="px-2 py-2">{t.sku}</th>
                <th className="px-2 py-2">{t.fcBto}</th>
                <th className="px-2 py-2">{t.fcBts}</th>
                <th className="px-2 py-2">{t.fcCreatedAt}</th>
                <th className="px-2 py-2">{t.fcActions}</th>
                <th className="px-2 py-2">{t.fcComment}</th>
              </tr>
            </thead>
            <tbody>
              {forecastRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-2 py-6 text-center text-app-muted">
                    {t.fcEmpty}
                  </td>
                </tr>
              ) : (
                forecastRecords.map((row) => (
                  <tr key={row.id} className="border-b border-app-border/40">
                    <td className="px-2 py-2 whitespace-nowrap">{formatForecastMonthCell(row.month, language)}</td>
                    <td className="px-2 py-2">{row.poNumber || "—"}</td>
                    <td className="px-2 py-2">{row.region}</td>
                    <td className="max-w-[8rem] break-words px-2 py-2">{row.destination || "—"}</td>
                    <td className="max-w-[10rem] break-words px-2 py-2">{row.productName}</td>
                    <td className="px-2 py-2 font-medium">{row.sku}</td>
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

      <CashFlowDashboard language={language} entries={entries} costAnalysisEntries={costAnalysisEntries} />

      <p className="text-sm text-app-muted">{t.tableHint}</p>

      <div className="app-table-shell overflow-x-auto">
        <table className="w-full min-w-[1200px] border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-app-border/80 bg-app-surface/80 text-left text-app-muted">
              <th className="px-2 py-2">{t.sku}</th>
              <th className="px-2 py-2">{t.orderDate}</th>
              <th className="px-2 py-2">{t.qty}</th>
              <th className="px-2 py-2">{t.orderNo}</th>
              <th className="px-2 py-2">{t.unitPrice}</th>
              <th className="px-2 py-2">{t.total}</th>
              <th className="px-2 py-2">{t.advPct}</th>
              <th className="px-2 py-2">{t.termDays}</th>
              <th className="px-2 py-2">{t.finPct}</th>
              <th className="px-2 py-2">{t.actAdvDate}</th>
              <th className="px-2 py-2">{t.actAdvAmt}</th>
              <th className="px-2 py-2">{t.actFinDate}</th>
              <th className="px-2 py-2">{t.actFinAmt}</th>
              <th className="px-2 py-2">{t.remark}</th>
              <th className="px-2 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={15} className="px-2 py-6 text-center text-app-muted">
                  {language === "en" ? "No rows yet." : "暂无数据。"}
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr key={row.id} className="border-b border-app-border/40">
                  <td className="px-2 py-2 font-medium">{row.sku}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{row.orderDate}</td>
                  <td className="px-2 py-2 text-right">{row.quantity}</td>
                  <td className="px-2 py-2 break-all">{row.orderNumber}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatUsd(row.unitPrice, 4)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{formatUsd(row.totalAmount, 2)}</td>
                  <td className="px-2 py-2 text-right">{row.advanceRatioPct}%</td>
                  <td className="px-2 py-2 text-right">{row.paymentTermDays}</td>
                  <td className="px-2 py-2 text-right">{row.finalRatioPct}%</td>
                  <td className="px-2 py-2 whitespace-nowrap">{row.actualAdvanceDate ?? "—"}</td>
                  <td className="px-2 py-2 text-right">
                    {row.actualAdvanceAmount != null ? row.actualAdvanceAmount.toFixed(2) : "—"}
                  </td>
                  <td className="px-2 py-2 whitespace-nowrap">{row.actualFinalDate ?? "—"}</td>
                  <td className="px-2 py-2 text-right tabular-nums">
                    {row.actualFinalAmount != null ? formatUsd(row.actualFinalAmount, 2) : "—"}
                  </td>
                  <td className="max-w-[8rem] break-words px-2 py-2">{row.remarks || "—"}</td>
                  <td className="whitespace-nowrap px-2 py-2">
                    <button
                      type="button"
                      className="mr-1 text-app-accent hover:underline"
                      onClick={() => fillFromEntry(row)}
                    >
                      {t.edit}
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => onDelete(row.id)}
                      disabled={loading}
                    >
                      {t.delete}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form className="rounded-2xl border border-app-border/90 bg-app-surface/50 p-4" onSubmit={onSubmit}>
        <p className="mb-3 text-sm font-medium text-foreground">
          {editingId ? (language === "en" ? "Edit row" : "编辑行") : t.add}
        </p>
        {costAnalysisEntries.length === 0 ? (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
            {t.noCostData}
          </p>
        ) : null}
        {editingId && form.orderNumber && !matchedCostRow ? (
          <p className="text-sm text-red-600">{t.orphanEdit}</p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="text-sm sm:col-span-2 lg:col-span-2">
            {t.pickCostLine}
            <select
              className={inputBase}
              value={selectedCostLineId}
              onChange={(e) => {
                const id = e.target.value.trim();
                if (!id) {
                  setForm((f) => ({
                    ...f,
                    orderNumber: "",
                    sku: "",
                    unitPrice: 0,
                    quantity: 0,
                    totalAmount: 0,
                  }));
                  return;
                }
                const row = costAnalysisEntries.find((c) => c.id === id);
                if (!row) return;
                setForm((f) => ({
                  ...f,
                  orderNumber: row.orderNumber,
                  sku: row.sku,
                  unitPrice: row.unitCostWithTariff,
                  quantity: row.quantity,
                  totalAmount: computeTotalAmount(row.quantity, row.unitCostWithTariff),
                }));
              }}
              required
            >
              <option value="">{language === "en" ? "— Select —" : "— 请选择 —"}</option>
              {costAnalysisEntries.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.orderNumber} · {c.sku} · {c.supplierName || "—"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            {t.orderNo}
            <input className={readOnlyMuted} value={form.orderNumber} readOnly tabIndex={-1} />
          </label>
          <label className="text-sm">
            {t.sku}
            <input className={readOnlyMuted} value={form.sku} readOnly tabIndex={-1} />
          </label>
          <label className="text-sm">
            {t.orderDate}
            <input
              type="date"
              className={inputBase}
              value={form.orderDate}
              onChange={(e) => setForm((f) => ({ ...f, orderDate: e.target.value }))}
              required
            />
          </label>
          <label className="text-sm">
            <span className="flex flex-wrap items-center gap-1">
              {t.qty}
              <span className="text-xs font-normal text-app-muted">({t.qtyHint})</span>
            </span>
            <input
              type="number"
              min={0}
              step={1}
              className={readOnlyMuted}
              value={form.quantity === 0 && !form.orderNumber ? "" : form.quantity}
              readOnly
              tabIndex={-1}
              title={t.qtyHint}
            />
          </label>
          <label className="text-sm">
            <span className="flex flex-wrap items-center gap-1">
              {t.unitPrice}
              <span className="text-xs font-normal text-app-muted">({t.unitPriceHint})</span>
            </span>
            <input
              type="text"
              className={readOnlyMuted}
              value={form.unitPrice ? formatUsd(form.unitPrice, 4) : ""}
              readOnly
              tabIndex={-1}
              title={t.unitPriceReadOnly}
            />
          </label>
          <label className="text-sm">
            {t.total}
            <input
              type="text"
              className={`${inputBase} bg-app-muted/20`}
              readOnly
              value={formatUsd(form.totalAmount, 2)}
              tabIndex={-1}
            />
          </label>
          <label className="text-sm">
            {t.advPct}
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              className={inputBase}
              value={form.advanceRatioPct || ""}
              onChange={(e) => {
                const adv = Number(e.target.value);
                setForm((f) => ({
                  ...f,
                  advanceRatioPct: adv,
                  finalRatioPct: Math.round((100 - adv) * 10) / 10,
                }));
              }}
              required
            />
          </label>
          <label className="text-sm">
            {t.termDays}
            <input
              type="number"
              min={0}
              step={1}
              className={inputBase}
              value={form.paymentTermDays || ""}
              onChange={(e) => setForm((f) => ({ ...f, paymentTermDays: Number(e.target.value) }))}
              required
            />
          </label>
          <label className="text-sm">
            {t.finPct}
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              className={inputBase}
              value={form.finalRatioPct || ""}
              onChange={(e) => {
                const fin = Number(e.target.value);
                setForm((f) => ({
                  ...f,
                  finalRatioPct: fin,
                  advanceRatioPct: Math.round((100 - fin) * 10) / 10,
                }));
              }}
              required
            />
          </label>
          <label className="text-sm">
            {t.actAdvDate}
            <input
              type="text"
              className={readOnlyMuted}
              readOnly
              tabIndex={-1}
              value={derivedActuals.actualAdvanceDate}
            />
          </label>
          <label className="text-sm">
            {t.actAdvAmt}
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-sm text-app-muted">$</span>
              <input
                type="number"
                min={0}
                step="0.01"
                className={moneyInputBase}
                value={form.actualAdvanceAmount ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    actualAdvanceAmount: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
          </label>
          <label className="text-sm">
            {t.actFinDate}
            <input
              type="text"
              className={readOnlyMuted}
              readOnly
              tabIndex={-1}
              value={derivedActuals.actualFinalDate}
            />
          </label>
          <label className="text-sm">
            {t.actFinAmt}
            <div className="relative mt-1">
              <span className="pointer-events-none absolute left-2 top-1/2 z-10 -translate-y-1/2 text-sm text-app-muted">$</span>
              <input
                type="text"
                className={`${moneyInputBase} cursor-not-allowed bg-app-muted/25`}
                readOnly
                tabIndex={-1}
                value={formatUsd(derivedActuals.actualFinalAmount, 2)}
              />
            </div>
          </label>
          <label className="text-sm sm:col-span-2">
            {t.remark}
            <input
              className={inputBase}
              value={form.remarks}
              onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
            />
          </label>
        </div>
        <p className="mt-2 text-xs text-app-muted">
          {t.expectedAdv}: {formatUsd(expectedAdv, 2)} · {t.expectedFin}: {formatUsd(expectedFin, 2)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={loading || costAnalysisEntries.length === 0}
            className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60"
          >
            {t.save}
          </button>
          {editingId ? (
            <button type="button" className="rounded-lg border border-app-border px-4 py-2 text-sm" onClick={reset}>
              {t.cancel}
            </button>
          ) : null}
        </div>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </form>
    </div>
  );
}
