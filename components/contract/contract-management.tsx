"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ccInputMd,
  ccInputSm,
  ccLabel,
  ccReadOnly,
  ccSelectLg,
  ccSelectMd,
  ccSelectSm,
} from "@/components/cost-control/cost-control-form-controls";
import {
  DOMESTIC_CONTRACT_CURRENCY,
  domesticCnyContractUnitFromUsdBasis,
} from "@/lib/contract-domestic-pricing";

import type { Language } from "@/lib/i18n";
import type {
  ContractEntry,
  ContractStatus,
  OrderContractCreateHint,
  OrderProgressEntry,
  SupplierEntry,
  UnitCostQuoteEntry,
  UserRole,
} from "@/lib/types";

type ContractManagementProps = {
  contracts: ContractEntry[];
  orders: OrderProgressEntry[];
  orderContractHints: Record<string, OrderContractCreateHint>;
  suppliers: SupplierEntry[];
  unitCostQuotes: UnitCostQuoteEntry[];
  language: Language;
  role: UserRole;
};

function contractHintHelp(language: Language, hint: OrderContractCreateHint | undefined): string {
  if (!hint || hint.ready) return "";
  const en = language === "en";
  switch (hint.reasonKey) {
    case "missing_po_or_sku":
      return en
        ? "This order needs a PO number and SKU that match a forecast line."
        : "该订单需具备与 Forecast 行一致的 PO 号与 SKU。";
    case "forecast_not_found":
      return en
        ? "No forecast matches this PO and SKU in your regions."
        : "在您可见区域内，没有与该 PO + SKU 匹配的 Forecast。";
    case "cash_flow_supplier_empty":
      return en
        ? "Open Cost control → Cash flow analysis and pick a supplier for this forecast row."
        : "请在「成本控制 → 现金流分析」中为该 Forecast 行选择供应商。";
    case "supplier_not_in_master":
      return en
        ? `Cash flow supplier "${hint.cashFlowSupplierName}" is missing in Suppliers (or inactive).`
        : `现金流中的供应商「${hint.cashFlowSupplierName}」在「供应商」主数据中不存在或未启用。`;
    case "resolution_error":
      return en
        ? "Could not load supplier link (temporary error). Refresh the page or try again."
        : "暂时无法加载供应商关联，请刷新页面或稍后重试。";
    default:
      return "";
  }
}

function canTransition(role: UserRole, current: ContractStatus, next: ContractStatus) {
  if (current === next) return true;
  return role === "super_admin";
}

function statusBadgeClass(status: ContractStatus) {
  if (status === "draft") return "bg-amber-50 text-amber-700 ring-amber-200";
  if (status === "approved") return "bg-sky-50 text-sky-700 ring-sky-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

function getAvailableActions(
  role: UserRole,
  status: ContractStatus,
): { key: string; label: string; next: ContractStatus }[] {
  if (role !== "super_admin") return [];
  if (status === "draft") {
    return [
      { key: "to-approved", label: "Approve", next: "approved" as ContractStatus },
      { key: "to-sent", label: "Mark as sent", next: "sent" },
    ];
  }
  if (status === "approved") {
    return [
      { key: "to-draft", label: "Return to draft", next: "draft" as ContractStatus },
      { key: "to-sent", label: "Mark as sent", next: "sent" },
    ];
  }
  return [{ key: "sent-to-approved", label: "Reopen to approved", next: "approved" }];
}

export function ContractManagement({
  contracts,
  orders,
  orderContractHints,
  suppliers,
  unitCostQuotes,
  language,
  role,
}: ContractManagementProps) {
  const router = useRouter();
  const en = language === "en";
  const t = {
    createTitle: "Create Contract (from order)",
    orderLine: "Order line",
    supplier: en ? "Supplier (from Forecast cash flow)" : "供应商（来自现金流 Forecast）",
    supplierHint: en
      ? "Taken from Cost control → Cash flow analysis for the matching forecast (PO + SKU)."
      : "取自「成本控制 → 现金流分析」中与该订单 PO+SKU 匹配的 Forecast 行。",
    batch: "Batch",
    currency: "Currency",
    unitPrice: language === "en" ? "Unit price (USD)" : "单价 (USD)",
    unitPriceDomestic: language === "en" ? "Unit price (CNY, incl. 13% VAT)" : "单价（人民币，含 13% 增值税）",
    domesticUnitHint:
      language === "en"
        ? "From USD basis × 7 × 1.13. Order snapshot stays in USD."
        : "由美金口径 ×7×1.13 换算；订单上的成本快照仍为美金口径。",
    paymentTerms: en ? "Payment terms" : "付款条款",
    paymentTermsHint: en
      ? "From Supply Chain → Suppliers for the resolved supplier."
      : "取自「供应链 → 供应商」主数据中该供应商的付款条款。",
    fieldHintsSummary: en ? "How fields are filled" : "字段说明",
    openCashFlow: en ? "Open cash flow analysis" : "打开现金流分析",
    cannotCreateYet: en ? "Cannot create contract yet" : "暂无法创建合同",
    deliveryAddress: "Delivery address",
    remark: language === "en" ? "Remark" : "备注",
    serialCode: "Serial code",
    bluetoothId: "Bluetooth ID",
    create: "Create contract",
    listTitle: "Contracts",
    download: "Download PDF",
    details: "Details",
    empty: "No contracts yet.",
    status: "Status",
    filterStatus: "Filter by status",
    filterSupplier: "Filter by supplier",
    all: "All",
    draft: "Draft",
    approved: "Approved",
    sent: "Sent",
    approvalHint:
      role === "super_admin"
        ? "You can approve contracts and unlock print/forward actions."
        : "New contracts remain draft until approved by super admin. Print/forward is locked before approval.",
  };

  const [orderProgressId, setOrderProgressId] = useState(orders[0]?.id ?? "");
  const [batch, setBatch] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [remark, setRemark] = useState("");
  const [serialCode, setSerialCode] = useState("");
  const [bluetoothId, setBluetoothId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  /** Create form only: green on success, red on error (avoid showing success in red). */
  const [createFeedback, setCreateFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (supplierFilter !== "all" && c.supplierId !== supplierFilter) return false;
      return true;
    });
  }, [contracts, statusFilter, supplierFilter]);

  const latestUnitCostBySkuSupplier = useMemo(() => {
    const m = new Map<string, UnitCostQuoteEntry>();
    // `unitCostQuotes` is already sorted by quoteDate desc (server), keep first hit as "latest".
    for (const q of unitCostQuotes) {
      const sku = q.sku.trim();
      const sup = q.supplierName.trim();
      if (!sku || !sup) continue;
      const k = `${sku}::${sup}`;
      if (!m.has(k)) m.set(k, q);
    }
    return m;
  }, [unitCostQuotes]);

  const selectedOrder = useMemo(
    () => orders.find((o) => o.id === orderProgressId) ?? null,
    [orders, orderProgressId],
  );
  const orderHint = orderContractHints[orderProgressId];
  const selectedSupplierName = (orderHint?.cashFlowSupplierName ?? "").trim();
  const quoteUnitPriceUsd =
    selectedOrder?.sku && selectedSupplierName
      ? latestUnitCostBySkuSupplier.get(`${selectedOrder.sku.trim()}::${selectedSupplierName}`)?.unitPrice ?? null
      : null;
  const snapshot = selectedOrder?.unitCostSnapshot ?? null;
  const selectedUnitPriceUsd =
    snapshot != null && Number.isFinite(snapshot) && snapshot > 0
      ? snapshot
      : quoteUnitPriceUsd;

  const displayContractUnit = useMemo(() => {
    if (selectedUnitPriceUsd == null || !Number.isFinite(selectedUnitPriceUsd) || selectedUnitPriceUsd <= 0) {
      return null;
    }
    if (orderHint?.domesticContractBilling) {
      return domesticCnyContractUnitFromUsdBasis(selectedUnitPriceUsd);
    }
    return selectedUnitPriceUsd;
  }, [orderHint?.domesticContractBilling, selectedUnitPriceUsd]);

  useEffect(() => {
    if (!orderHint?.ready) return;
    if (orderHint.domesticContractBilling) {
      setCurrency(DOMESTIC_CONTRACT_CURRENCY);
    } else {
      setCurrency("USD");
    }
  }, [orderHint?.ready, orderHint?.domesticContractBilling, orderProgressId]);

  const orderOptionLabel = (o: OrderProgressEntry) => {
    const po = (o.orderNumber || "").trim() || "—";
    const sku = (o.sku || "").trim() || "—";
    return `${po} · ${sku}`;
  };

  const orderBlockerText =
    orderHint && !orderHint.ready ? contractHintHelp(language, orderHint) : "";
  const orderBlockerShowCashFlowLink =
    orderHint &&
    !orderHint.ready &&
    (orderHint.reasonKey === "cash_flow_supplier_empty" || orderHint.reasonKey === "forecast_not_found");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setCreateFeedback(null);
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderProgressId,
        batch,
        currency,
        deliveryAddress,
        remark,
        serialCode,
        bluetoothId,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      const err = data.message || "Request failed";
      setCreateFeedback({ ok: false, text: err });
      return;
    }
    setBatch("");
    setCurrency("USD");
    setDeliveryAddress("");
    setRemark("");
    setSerialCode("");
    setBluetoothId("");
    setCreateFeedback({
      ok: true,
      text: "Contract created in draft. Waiting for super admin approval before print/forward.",
    });
    router.refresh();
  }

  async function onSetStatus(id: string, status: ContractStatus) {
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/contracts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || "Status update failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="min-w-0 space-y-4">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">{t.createTitle}</h3>
        <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={onCreate}>
          <details className="w-full shrink-0 basis-full">
            <summary className="cursor-pointer select-none text-xs text-app-muted hover:text-foreground/80">
              {t.fieldHintsSummary}
            </summary>
            <div className="mt-2 space-y-1.5 border-l-2 border-app-border/70 pl-3 text-xs leading-relaxed text-app-muted">
              <p>
                <span className="font-medium text-foreground/80">{t.supplier}</span>
                {" — "}
                {t.supplierHint}
              </p>
              <p>
                <span className="font-medium text-foreground/80">{t.paymentTerms}</span>
                {" — "}
                {t.paymentTermsHint}
              </p>
            </div>
          </details>

          {orderBlockerText ? (
            <div
              className="flex w-full shrink-0 basis-full flex-col gap-2 rounded-lg border border-amber-200/90 bg-amber-50/90 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between dark:border-amber-700/50 dark:bg-amber-950/40"
              role="status"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">{t.cannotCreateYet}</p>
                <p className="mt-0.5 text-xs text-amber-800 dark:text-amber-100/90">{orderBlockerText}</p>
              </div>
              {orderBlockerShowCashFlowLink ? (
                <Link
                  href="/supply-chain/cost-control?tab=cashflow"
                  className="shrink-0 rounded-md border border-amber-300/80 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100/80 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-100 dark:hover:bg-amber-900/50"
                >
                  {t.openCashFlow}
                </Link>
              ) : null}
            </div>
          ) : null}

          <label className="min-w-0 shrink-0">
            <span className={ccLabel}>{t.orderLine}</span>
            <select
              value={orderProgressId}
              title={
                selectedOrder
                  ? `${selectedOrder.orderNumber || "—"} | ${selectedOrder.productName} | ${selectedOrder.sku}`
                  : undefined
              }
              onChange={(e) => setOrderProgressId(e.target.value)}
              className={`${ccSelectLg} truncate`}
            >
              {orders.map((o) => (
                <option
                  value={o.id}
                  key={o.id}
                  title={`${o.orderNumber || "—"} | ${o.productName} | ${o.sku}`}
                >
                  {orderOptionLabel(o)}
                </option>
              ))}
            </select>
            {selectedOrder ? (
              <p
                className="mt-1 truncate text-xs text-app-muted"
                title={selectedOrder.productName}
              >
                {selectedOrder.productName}
              </p>
            ) : null}
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{t.supplier}</span>
            <input
              readOnly
              value={orderHint?.cashFlowSupplierName?.trim() ? orderHint.cashFlowSupplierName : "—"}
              className={`${ccReadOnly} app-control-md`}
            />
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{t.batch}</span>
            <input
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              required
              autoComplete="off"
              className={ccInputSm}
            />
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{t.currency}</span>
            <input
              value={currency}
              readOnly={orderHint?.domesticContractBilling === true}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              required
              autoComplete="off"
              className={`${ccInputSm} read-only:bg-slate-50`}
            />
          </label>
          <label
            className="shrink-0"
            title={orderHint?.domesticContractBilling ? t.domesticUnitHint : undefined}
          >
            <span className={ccLabel}>
              {orderHint?.domesticContractBilling ? t.unitPriceDomestic : t.unitPrice}
            </span>
            <input
              readOnly
              value={
                displayContractUnit != null && Number.isFinite(displayContractUnit)
                  ? displayContractUnit.toFixed(2)
                  : "—"
              }
              className={`${ccReadOnly} app-control-num tabular-nums`}
            />
          </label>
          <label className="min-w-0 shrink-0">
            <span className={ccLabel}>{t.paymentTerms}</span>
            <input
              readOnly
              title={orderHint?.paymentTerms?.trim() ? orderHint.paymentTerms : undefined}
              value={orderHint?.paymentTerms?.trim() ? orderHint.paymentTerms : "—"}
              className={`${ccReadOnly} app-control-md max-w-[18rem]`}
            />
          </label>
          <label className="w-full shrink-0 basis-full sm:max-w-2xl">
            <span className={ccLabel}>{t.deliveryAddress}</span>
            <input
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              required
              autoComplete="street-address"
              placeholder={t.deliveryAddress}
              className={`${ccInputMd} max-w-2xl`}
            />
          </label>
          <label className="w-full shrink-0 basis-full sm:max-w-xl">
            <span className={ccLabel}>{t.remark}</span>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={2}
              placeholder={t.remark}
              className="mt-0 w-full min-w-0 max-w-xl resize-y rounded-lg border border-app-border px-2 py-1.5 text-sm min-h-[3rem]"
            />
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{t.serialCode}</span>
            <input
              value={serialCode}
              onChange={(e) => setSerialCode(e.target.value)}
              autoComplete="off"
              className={ccInputSm}
            />
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{t.bluetoothId}</span>
            <input
              value={bluetoothId}
              onChange={(e) => setBluetoothId(e.target.value)}
              autoComplete="off"
              className={ccInputSm}
            />
          </label>
          <button
            type="submit"
            disabled={
              loading ||
              !orderProgressId ||
              !orderHint?.ready ||
              !batch.trim() ||
              !currency.trim() ||
              !deliveryAddress.trim()
            }
            className="shrink-0 rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60"
          >
            {t.create}
          </button>
        </form>
        {createFeedback ? (
          <p className={`mt-2 text-sm ${createFeedback.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>
            {createFeedback.text}
          </p>
        ) : null}
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">{t.listTitle}</h3>
        <details className="mt-1 text-xs text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {en ? "Approval workflow" : "审批流程说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.approvalHint}</p>
        </details>
        <div className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-2">
          <label className="shrink-0">
            <span className={ccLabel}>{t.filterStatus}</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | ContractStatus)}
              className={ccSelectSm}
            >
              <option value="all">{t.all}</option>
              <option value="draft">{t.draft}</option>
              <option value="approved">{t.approved}</option>
              <option value="sent">{t.sent}</option>
            </select>
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{t.filterSupplier}</span>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className={ccSelectMd}
            >
              <option value="all">{t.all}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="app-table-shell mt-3 overflow-x-auto">
          <table className="w-full min-w-[1220px] border-collapse text-sm">
            <thead><tr className="border-b border-app-border/80 text-left text-app-muted"><th className="px-2 py-2">PO</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2">Product</th><th className="px-2 py-2">Supplier</th><th className="px-2 py-2">Qty</th><th className="px-2 py-2">Total</th><th className="px-2 py-2">{t.status}</th><th className="px-2 py-2">Action</th></tr></thead>
            <tbody>
              {filteredContracts.length === 0 ? (
                <tr><td colSpan={8} className="px-2 py-6 text-center text-app-muted">{t.empty}</td></tr>
              ) : filteredContracts.map((c) => (
                <tr key={c.id}>
                  <td className="px-2 py-2 font-medium">{c.poNumber}</td>
                  <td className="px-2 py-2">{c.sku}</td>
                  <td className="px-2 py-2">{c.productName}</td>
                  <td className="px-2 py-2">{c.supplierName}</td>
                  <td className="px-2 py-2">{c.quantity}</td>
                  <td className="px-2 py-2">{c.totalAmount.toFixed(2)}</td>
                  <td className="px-2 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ${statusBadgeClass(c.status)}`}>{c.status}</span>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Link className="rounded border border-app-border px-2 py-1 text-xs hover:bg-app-accent-soft" href={`/supply-chain/contracts/${encodeURIComponent(c.id)}`}>{t.details}</Link>
                      {getAvailableActions(role, c.status).map((action) => (
                        <button
                          key={action.key}
                          type="button"
                          disabled={loading || !canTransition(role, c.status, action.next)}
                          className="rounded border border-app-border px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => onSetStatus(c.id, action.next)}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
