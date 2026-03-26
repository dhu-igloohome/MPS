"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import type {
  ContractEntry,
  ContractStatus,
  OrderProgressEntry,
  SupplierEntry,
  UserRole,
} from "@/lib/types";

type ContractManagementProps = {
  contracts: ContractEntry[];
  orders: OrderProgressEntry[];
  suppliers: SupplierEntry[];
  language: Language;
  role: UserRole;
};

function canTransition(role: UserRole, current: ContractStatus, next: ContractStatus) {
  if (current === next) return true;
  if (role === "super_admin") return true;
  return (
    (current === "draft" && next === "approved") ||
    (current === "approved" && next === "draft")
  );
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
  if (status === "draft") {
    const actions = [{ key: "to-approved", label: "Submit for approval", next: "approved" as ContractStatus }];
    if (role === "super_admin") {
      actions.push({ key: "to-sent", label: "Mark as sent", next: "sent" });
    }
    return actions;
  }
  if (status === "approved") {
    const actions = [{ key: "to-draft", label: "Return to draft", next: "draft" as ContractStatus }];
    if (role === "super_admin") {
      actions.push({ key: "to-sent", label: "Mark as sent", next: "sent" });
    }
    return actions;
  }
  if (role === "super_admin") {
    return [{ key: "sent-to-approved", label: "Reopen to approved", next: "approved" }];
  }
  return [];
}

export function ContractManagement({ contracts, orders, suppliers, language: _language, role }: ContractManagementProps) {
  void _language;
  const router = useRouter();
  const t = {
    createTitle: "Create Contract (from order)",
    orderLine: "Order line",
    supplier: "Supplier",
    batch: "Batch",
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
  };

  const [orderProgressId, setOrderProgressId] = useState(orders[0]?.id ?? "");
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [batch, setBatch] = useState("");
  const [serialCode, setSerialCode] = useState("");
  const [bluetoothId, setBluetoothId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ContractStatus>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (supplierFilter !== "all" && c.supplierId !== supplierFilter) return false;
      return true;
    });
  }, [contracts, statusFilter, supplierFilter]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderProgressId, supplierId, batch, serialCode, bluetoothId }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || "Request failed");
      return;
    }
    setBatch("");
    setSerialCode("");
    setBluetoothId("");
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
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">{t.createTitle}</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
          <label className="block">
            <span className="mb-1 block text-sm text-app-muted">{t.orderLine}</span>
            <select value={orderProgressId} onChange={(e) => setOrderProgressId(e.target.value)} className="w-full rounded-lg border border-app-border px-3 py-2 text-sm">
              {orders.map((o) => <option value={o.id} key={o.id}>{`${o.orderNumber || "-"} | ${o.productName} | ${o.sku}`}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-app-muted">{t.supplier}</span>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full rounded-lg border border-app-border px-3 py-2 text-sm">
              {suppliers.map((s) => <option value={s.id} key={s.id}>{s.name}</option>)}
            </select>
          </label>
          <input value={batch} onChange={(e) => setBatch(e.target.value)} required placeholder={t.batch} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={serialCode} onChange={(e) => setSerialCode(e.target.value)} placeholder={t.serialCode} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={bluetoothId} onChange={(e) => setBluetoothId(e.target.value)} placeholder={t.bluetoothId} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <div className="md:col-span-2">
            <button type="submit" disabled={loading || !orderProgressId || !supplierId || !batch.trim()} className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60">{t.create}</button>
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">{t.listTitle}</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="text-sm text-app-muted">
            {t.filterStatus}
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as "all" | ContractStatus)} className="mt-1 w-full rounded-lg border border-app-border px-3 py-2 text-sm text-foreground">
              <option value="all">{t.all}</option>
              <option value="draft">{t.draft}</option>
              <option value="approved">{t.approved}</option>
              <option value="sent">{t.sent}</option>
            </select>
          </label>
          <label className="text-sm text-app-muted">
            {t.filterSupplier}
            <select value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)} className="mt-1 w-full rounded-lg border border-app-border px-3 py-2 text-sm text-foreground">
              <option value="all">{t.all}</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1220px] border-collapse text-sm">
            <thead><tr className="border-b border-app-border/80 text-left text-app-muted"><th className="px-2 py-2">PO</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2">Product</th><th className="px-2 py-2">Supplier</th><th className="px-2 py-2">Qty</th><th className="px-2 py-2">Total</th><th className="px-2 py-2">{t.status}</th><th className="px-2 py-2">Action</th></tr></thead>
            <tbody>
              {filteredContracts.length === 0 ? (
                <tr><td colSpan={8} className="px-2 py-6 text-center text-app-muted">{t.empty}</td></tr>
              ) : filteredContracts.map((c) => (
                <tr key={c.id} className="border-b border-app-border/35">
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
                      <Link className="rounded border border-app-border px-2 py-1 text-xs hover:bg-app-accent-soft" href={`/contracts/${encodeURIComponent(c.id)}`}>{t.details}</Link>
                      <a className="rounded border border-app-border px-2 py-1 text-xs hover:bg-app-accent-soft" href={`/api/contracts/${encodeURIComponent(c.id)}/pdf`}>{t.download}</a>
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
