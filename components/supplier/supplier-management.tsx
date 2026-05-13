"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import type { SupplierEntry } from "@/lib/types";

type SupplierManagementProps = {
  suppliers: SupplierEntry[];
  language: Language;
};

export function SupplierManagement({ suppliers, language }: SupplierManagementProps) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "Supplier Management" : "Supplier Management",
    name: language === "en" ? "Supplier name" : "Supplier name",
    address: language === "en" ? "Address" : "Address",
    contactName: language === "en" ? "Contact person" : "Contact person",
    contactPhone: language === "en" ? "Phone" : "Phone",
    email: language === "en" ? "Email" : "Email",
    paymentTerms: language === "en" ? "Payment terms" : "Payment terms",
    leadTimeDays: language === "en" ? "Lead time (days)" : "Lead time (days)",
    moq: language === "en" ? "MOQ" : "MOQ",
    incoterm: language === "en" ? "Incoterm" : "Incoterm",
    status: language === "en" ? "Status" : "Status",
    active: language === "en" ? "Active" : "Active",
    inactive: language === "en" ? "Inactive" : "Inactive",
    create: language === "en" ? "Create supplier" : "Create supplier",
    save: language === "en" ? "Save" : "Save",
    cancel: language === "en" ? "Cancel" : "Cancel",
    edit: language === "en" ? "Edit" : "Edit",
    remove: language === "en" ? "Delete" : "Delete",
    actions: language === "en" ? "Actions" : "Actions",
    empty: language === "en" ? "No suppliers yet." : "No suppliers yet.",
    confirmDelete: language === "en" ? "Delete this supplier?" : "Delete this supplier?",
  };

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [leadTimeDays, setLeadTimeDays] = useState("0");
  const [moq, setMoq] = useState("0");
  const [incoterm, setIncoterm] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const editingRow = useMemo(() => suppliers.find((s) => s.id === editingId) ?? null, [editingId, suppliers]);

  function startEdit(s: SupplierEntry) {
    setEditingId(s.id);
    setName(s.name);
    setAddress(s.address);
    setContactName(s.contactName);
    setContactPhone(s.contactPhone);
    setEmail(s.email);
    setPaymentTerms(s.paymentTerms);
    setLeadTimeDays(String(s.leadTimeDays));
    setMoq(String(s.moq));
    setIncoterm(s.incoterm);
    setIsActive(s.isActive);
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setAddress("");
    setContactName("");
    setContactPhone("");
    setEmail("");
    setPaymentTerms("");
    setLeadTimeDays("0");
    setMoq("0");
    setIncoterm("");
    setIsActive(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const leadDaysNum = Number(leadTimeDays);
    const moqNum = Number(moq);
    if (!Number.isFinite(leadDaysNum) || leadDaysNum < 0 || !Number.isFinite(moqNum) || moqNum < 0) {
      setLoading(false);
      setMessage("Lead time and MOQ must be non-negative numbers.");
      return;
    }
    const url = editingId ? `/api/suppliers/${encodeURIComponent(editingId)}` : "/api/suppliers";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        address,
        contactName,
        contactPhone,
        email,
        paymentTerms,
        leadTimeDays: leadDaysNum,
        moq: moqNum,
        incoterm,
        isActive,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || "Request failed");
      return;
    }
    resetForm();
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm(t.confirmDelete)) return;
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/suppliers/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || "Delete failed");
      return;
    }
    if (editingId === id) resetForm();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        {editingRow ? <p className="mt-2 text-sm text-app-muted">Editing: {editingRow.name}</p> : null}
        <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" onSubmit={onSubmit}>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t.name} className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t.contactName} className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={t.contactPhone} className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.address} className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t.email} className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder={t.paymentTerms} className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" />
          <label className="min-w-0 text-sm text-app-muted">
            <span className="mb-1 block">{t.leadTimeDays}</span>
            <input
              type="number"
              min={0}
              step={1}
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm text-foreground"
            />
          </label>
          <label className="min-w-0 text-sm text-app-muted">
            <span className="mb-1 block">{t.moq}</span>
            <input
              type="number"
              min={0}
              step={1}
              value={moq}
              onChange={(e) => setMoq(e.target.value)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm text-foreground"
            />
          </label>
          <input value={incoterm} onChange={(e) => setIncoterm(e.target.value)} placeholder={t.incoterm} className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" />
          <label className="flex min-w-0 items-center gap-2 rounded-lg border border-app-border px-3 py-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            {t.active}
          </label>
          <div className="flex min-w-0 gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <button type="submit" disabled={loading || !name.trim()} className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60">{editingId ? t.save : t.create}</button>
            {editingId ? <button type="button" onClick={resetForm} className="rounded-lg border border-app-border px-4 py-2 text-sm">{t.cancel}</button> : null}
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1300px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border/80 text-left text-app-muted">
                <th className="px-2 py-2">{t.name}</th>
                <th className="px-2 py-2">{t.contactName}</th>
                <th className="px-2 py-2">{t.contactPhone}</th>
                <th className="px-2 py-2">{t.email}</th>
                <th className="px-2 py-2">{t.address}</th>
                <th className="px-2 py-2">{t.paymentTerms}</th>
                <th className="px-2 py-2">{t.leadTimeDays}</th>
                <th className="px-2 py-2">{t.moq}</th>
                <th className="px-2 py-2">{t.incoterm}</th>
                <th className="px-2 py-2">{t.status}</th>
                <th className="px-2 py-2">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td className="px-2 py-6 text-center text-app-muted" colSpan={11}>{t.empty}</td></tr>
              ) : suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="px-2 py-2">{s.name}</td>
                  <td className="px-2 py-2">{s.contactName || "-"}</td>
                  <td className="px-2 py-2">{s.contactPhone || "-"}</td>
                  <td className="px-2 py-2">{s.email || "-"}</td>
                  <td className="px-2 py-2">{s.address || "-"}</td>
                  <td className="px-2 py-2">{s.paymentTerms || "-"}</td>
                  <td className="px-2 py-2">{s.leadTimeDays}</td>
                  <td className="px-2 py-2">{s.moq}</td>
                  <td className="px-2 py-2">{s.incoterm || "-"}</td>
                  <td className="px-2 py-2">{s.isActive ? t.active : t.inactive}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button type="button" className="rounded border border-app-border px-2 py-1 text-xs" onClick={() => startEdit(s)}>{t.edit}</button>
                      <button type="button" className="rounded border border-red-200 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(s.id)}>{t.remove}</button>
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
