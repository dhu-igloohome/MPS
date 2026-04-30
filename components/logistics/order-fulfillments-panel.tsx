"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Save } from "lucide-react";

import type { Language } from "@/lib/i18n";
import type { OrderProgressEntry } from "@/lib/types";

type OrderFulfillmentsPanelProps = {
  language: Language;
  orderLines: OrderProgressEntry[];
};

function tableLabels(language: Language) {
  const en = language === "en";
  return {
    title: en ? "Order fulfillments" : "订单履约",
    intro: en
      ? "Pick a PO line to auto-fill SKU and order qty from Order Progress, then complete shipping fields."
      : "选择 PO 行后，将自动带出订单进度中该行的 SKU 与订单数量，再补充发运相关字段。",
    poNumber: en ? "PO number" : "PO 号",
    sku: "SKU",
    orderQty: en ? "Order qty" : "订单数量",
    targetCompletion: en ? "Target completion" : "目标完成",
    salesOrderNumber: en ? "Sales order number" : "销售订单号",
    shipFrom: en ? "Ship from" : "发货地",
    shipTo: en ? "Ship to" : "收货地",
    etd: en ? "ETD" : "ETD（预计发运）",
    eta: en ? "ETA" : "ETA（预计到达）",
    trackingLink: en ? "Tracking link" : "跟踪链接",
    mpBatch: en ? "MP batch" : "MP 批次",
    balanceQty: en ? "Balance Qty" : "结余数量",
    selectPo: en ? "Select PO…" : "选择 PO…",
    noOrderLines: en ? "No order lines in your regions" : "您有权限的区域内暂无订单行",
    pickDate: en ? "Pick date" : "选择日期",
    phShipFrom: en ? "Origin / warehouse" : "发货地/仓库",
    phShipTo: en ? "Destination" : "目的地",
    phTracking: en ? "https://…" : "https://…",
    phMpBatch: en ? "Batch code" : "批次编号",
    phBalanceQty: en ? "Qty" : "数量",
    phTargetCompletion: en ? "e.g. 2026-04-30, Q2…" : "如 2026-04-30、二季度…",
  };
}

const cellInputClass =
  "w-full min-w-[6.5rem] rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm outline-none ring-app-accent focus:ring-2";

const readOnlyDerivedClass =
  "w-full min-w-[5.5rem] rounded-lg border border-app-border/80 bg-app-accent-soft/45 px-2 py-1.5 text-sm text-foreground/90 cursor-default";

export function OrderFulfillmentsPanel({ language, orderLines }: OrderFulfillmentsPanelProps) {
  const t = tableLabels(language);
  const router = useRouter();
  const [poLineId, setPoLineId] = useState("");
  const [targetCompletion, setTargetCompletion] = useState("");
  const [salesOrderNumber, setSalesOrderNumber] = useState("");
  const [shipFrom, setShipFrom] = useState("");
  const [shipTo, setShipTo] = useState("");
  const [etd, setEtd] = useState("");
  const [eta, setEta] = useState("");
  const [trackingLink, setTrackingLink] = useState("");
  const [mpBatch, setMpBatch] = useState("");
  const [balanceQty, setBalanceQty] = useState("");
  const [editing, setEditing] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const options = useMemo(
    () =>
      [...orderLines].sort((a, b) =>
        (a.orderNumber || "").localeCompare(b.orderNumber || "", undefined, { numeric: true }),
      ),
    [orderLines],
  );

  const optionLabel = (row: OrderProgressEntry) => {
    const po = (row.orderNumber || "").trim() || "—";
    return `${po} · ${row.sku}`;
  };

  const selectedLine = useMemo(
    () => (poLineId ? orderLines.find((r) => r.id === poLineId) : undefined),
    [orderLines, poLineId],
  );
  const derivedSku = selectedLine?.sku ?? "";
  const derivedOrderQty =
    selectedLine != null && Number.isFinite(selectedLine.quantity) ? String(selectedLine.quantity) : "";

  useEffect(() => {
    setMessage("");
    if (!selectedLine) {
      setTargetCompletion("");
      setSalesOrderNumber("");
      setShipFrom("");
      setShipTo("");
      setEtd("");
      setEta("");
      setTrackingLink("");
      setMpBatch("");
      setBalanceQty("");
      setEditing(true);
      return;
    }
    setTargetCompletion(selectedLine.fulfillmentTargetCompletion ?? "");
    setSalesOrderNumber(selectedLine.fulfillmentSalesOrderNumber ?? "");
    setShipFrom(selectedLine.fulfillmentShipFrom ?? "");
    setShipTo(selectedLine.fulfillmentShipTo ?? "");
    setEtd(selectedLine.fulfillmentEtd ?? "");
    setEta(selectedLine.fulfillmentEta ?? "");
    setTrackingLink(selectedLine.fulfillmentTrackingLink ?? "");
    setMpBatch(selectedLine.fulfillmentMpBatch ?? "");
    setBalanceQty(
      selectedLine.fulfillmentBalanceQty != null ? String(selectedLine.fulfillmentBalanceQty) : "",
    );

    const hasAnySaved =
      Boolean((selectedLine.fulfillmentTargetCompletion ?? "").trim()) ||
      Boolean((selectedLine.fulfillmentSalesOrderNumber ?? "").trim()) ||
      Boolean((selectedLine.fulfillmentShipFrom ?? "").trim()) ||
      Boolean((selectedLine.fulfillmentShipTo ?? "").trim()) ||
      Boolean((selectedLine.fulfillmentEtd ?? "").trim?.() ?? selectedLine.fulfillmentEtd) ||
      Boolean((selectedLine.fulfillmentEta ?? "").trim?.() ?? selectedLine.fulfillmentEta) ||
      Boolean((selectedLine.fulfillmentTrackingLink ?? "").trim()) ||
      Boolean((selectedLine.fulfillmentMpBatch ?? "").trim()) ||
      Boolean((selectedLine.fulfillmentBalanceQty ?? 0) > 0);
    setEditing(!hasAnySaved);
  }, [selectedLine]);

  const inputCls = (readonly: boolean) =>
    readonly ? readOnlyDerivedClass : cellInputClass;

  async function onSave() {
    if (!selectedLine) return;
    setSaving(true);
    setMessage("");
    const res = await fetch(`/api/logistics-order-fulfillments/${encodeURIComponent(selectedLine.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        targetCompletion,
        salesOrderNumber,
        shipFrom,
        shipTo,
        etd: etd || null,
        eta: eta || null,
        trackingLink,
        mpBatch,
        balanceQty: Number(balanceQty || 0),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setSaving(false);
    if (!res.ok) {
      setMessage(data.message || (language === "en" ? "Save failed." : "保存失败。"));
      return;
    }
    setEditing(false);
    setMessage(language === "en" ? "Saved." : "已保存。");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{t.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/70">{t.intro}</p>

        <div className="app-table-shell mt-6 overflow-x-auto">
          <table className="w-full min-w-[1360px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left font-semibold text-foreground">
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.poNumber}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.sku}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.orderQty}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.targetCompletion}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.salesOrderNumber}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.shipFrom}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.shipTo}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.etd}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.eta}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.trackingLink}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.mpBatch}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.balanceQty}</th>
                <th className="px-3 py-2.5">{language === "en" ? "Actions" : "操作"}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-app-border/60 text-foreground/90">
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <select
                    value={poLineId}
                    onChange={(e) => setPoLineId(e.target.value)}
                    disabled={options.length === 0}
                    className="w-full min-w-[10rem] max-w-[18rem] rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm outline-none ring-app-accent focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <option value="">{options.length === 0 ? t.noOrderLines : t.selectPo}</option>
                    {options.map((row) => (
                      <option key={row.id} value={row.id}>
                        {optionLabel(row)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="text"
                    readOnly
                    value={derivedSku}
                    placeholder={language === "en" ? "—" : "—"}
                    title={language === "en" ? "From Order Progress line" : "来自订单进度行"}
                    aria-label={t.sku}
                    className={readOnlyDerivedClass}
                  />
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="text"
                    readOnly
                    value={derivedOrderQty}
                    placeholder={language === "en" ? "—" : "—"}
                    title={language === "en" ? "From Order Progress line" : "来自订单进度行"}
                    aria-label={t.orderQty}
                    className={`${readOnlyDerivedClass} tabular-nums`}
                  />
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="text"
                    value={targetCompletion}
                    onChange={(e) => setTargetCompletion(e.target.value)}
                    readOnly={!editing}
                    placeholder={t.phTargetCompletion}
                    aria-label={t.targetCompletion}
                    className={`${inputCls(!editing)} min-w-[8rem]`}
                  />
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="text"
                    value={salesOrderNumber}
                    onChange={(e) => setSalesOrderNumber(e.target.value)}
                    readOnly={!editing}
                    placeholder={language === "en" ? "Optional" : "选填"}
                    className={`w-full min-w-[8rem] max-w-[14rem] rounded-lg border border-app-border px-2 py-1.5 text-sm outline-none ring-app-accent focus:ring-2 ${
                      editing ? "bg-app-surface" : "cursor-default bg-app-accent-soft/45"
                    }`}
                  />
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="text"
                    value={shipFrom}
                    onChange={(e) => setShipFrom(e.target.value)}
                    readOnly={!editing}
                    placeholder={t.phShipFrom}
                    className={inputCls(!editing)}
                  />
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="text"
                    value={shipTo}
                    onChange={(e) => setShipTo(e.target.value)}
                    readOnly={!editing}
                    placeholder={t.phShipTo}
                    className={inputCls(!editing)}
                  />
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="date"
                    value={etd}
                    onChange={(e) => setEtd(e.target.value)}
                    readOnly={!editing}
                    title={t.pickDate}
                    aria-label={t.etd}
                    className={`${inputCls(!editing)} min-w-[10.5rem]`}
                  />
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="date"
                    value={eta}
                    onChange={(e) => setEta(e.target.value)}
                    readOnly={!editing}
                    title={t.pickDate}
                    aria-label={t.eta}
                    className={`${inputCls(!editing)} min-w-[10.5rem]`}
                  />
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="text"
                    value={trackingLink}
                    onChange={(e) => setTrackingLink(e.target.value)}
                    readOnly={!editing}
                    placeholder={t.phTracking}
                    className={inputCls(!editing)}
                  />
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="text"
                    value={mpBatch}
                    onChange={(e) => setMpBatch(e.target.value)}
                    readOnly={!editing}
                    placeholder={t.phMpBatch}
                    className={inputCls(!editing)}
                  />
                </td>
                <td className="border-r border-app-border/60 px-2 py-2 align-top">
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    value={balanceQty}
                    onChange={(e) => setBalanceQty(e.target.value)}
                    readOnly={!editing}
                    placeholder={t.phBalanceQty}
                    className={inputCls(!editing)}
                  />
                </td>
                <td className="px-2 py-2 align-top">
                  <div className="flex min-w-[10.5rem] flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={!selectedLine || saving || !editing}
                      onClick={() => void onSave()}
                      className="app-button-primary inline-flex items-center gap-2 px-3 py-1.5 text-sm transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
                    >
                      <Save size={16} strokeWidth={1.5} />
                      {language === "en" ? "Save" : "保存"}
                    </button>
                    <button
                      type="button"
                      disabled={!selectedLine || saving || editing}
                      onClick={() => setEditing(true)}
                      className="app-button-secondary inline-flex items-center gap-2 px-3 py-1.5 text-sm transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
                    >
                      <Edit3 size={16} strokeWidth={1.5} />
                      {language === "en" ? "Edit" : "编辑"}
                    </button>
                  </div>
                  {message ? (
                    <p className={`mt-2 text-xs ${message.includes("失败") || message.includes("failed") ? "text-red-700" : "text-emerald-800"}`}>
                      {message}
                    </p>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
