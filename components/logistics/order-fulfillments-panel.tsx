"use client";

import { useMemo, useState } from "react";

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
      ? "Link each fulfillment line to an Order Progress PO, then fill shipping details. PO options come from order lines in your regions."
      : "将履约行关联至订单进度中的 PO，并补充发运信息。PO 下拉选项来自您有权限区域内的订单行。",
    poNumber: en ? "PO number" : "PO 号",
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
  };
}

export function OrderFulfillmentsPanel({ language, orderLines }: OrderFulfillmentsPanelProps) {
  const t = tableLabels(language);
  const [poLineId, setPoLineId] = useState("");
  const [salesOrderNumber, setSalesOrderNumber] = useState("");

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

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold tracking-tight text-foreground sm:text-lg">{t.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/70">{t.intro}</p>

        <div className="app-table-shell mt-6 overflow-x-auto">
          <table className="w-full min-w-[1040px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left font-semibold text-foreground">
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.poNumber}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.salesOrderNumber}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.shipFrom}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.shipTo}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.etd}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.eta}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.trackingLink}</th>
                <th className="border-r border-app-border/80 px-3 py-2.5">{t.mpBatch}</th>
                <th className="px-3 py-2.5">{t.balanceQty}</th>
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
                    value={salesOrderNumber}
                    onChange={(e) => setSalesOrderNumber(e.target.value)}
                    placeholder={language === "en" ? "Optional" : "选填"}
                    className="w-full min-w-[8rem] max-w-[14rem] rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm outline-none ring-app-accent focus:ring-2"
                  />
                </td>
                <td className="border-r border-app-border/60 px-3 py-2 text-app-muted">—</td>
                <td className="border-r border-app-border/60 px-3 py-2 text-app-muted">—</td>
                <td className="border-r border-app-border/60 px-3 py-2 text-app-muted">—</td>
                <td className="border-r border-app-border/60 px-3 py-2 text-app-muted">—</td>
                <td className="border-r border-app-border/60 px-3 py-2 text-app-muted">—</td>
                <td className="border-r border-app-border/60 px-3 py-2 text-app-muted">—</td>
                <td className="px-3 py-2 text-app-muted">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
