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
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setAddress("");
    setContactName("");
    setContactPhone("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const url = editingId ? `/api/suppliers/${encodeURIComponent(editingId)}` : "/api/suppliers";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, contactName, contactPhone }),
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
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t.name} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t.contactName} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={t.contactPhone} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.address} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={loading || !name.trim()} className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60">{editingId ? t.save : t.create}</button>
            {editingId ? <button type="button" onClick={resetForm} className="rounded-lg border border-app-border px-4 py-2 text-sm">{t.cancel}</button> : null}
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border/80 text-left text-app-muted">
                <th className="px-2 py-2">{t.name}</th>
                <th className="px-2 py-2">{t.contactName}</th>
                <th className="px-2 py-2">{t.contactPhone}</th>
                <th className="px-2 py-2">{t.address}</th>
                <th className="px-2 py-2">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td className="px-2 py-6 text-center text-app-muted" colSpan={5}>{t.empty}</td></tr>
              ) : suppliers.map((s) => (
                <tr key={s.id} className="border-b border-app-border/35">
                  <td className="px-2 py-2">{s.name}</td>
                  <td className="px-2 py-2">{s.contactName || "-"}</td>
                  <td className="px-2 py-2">{s.contactPhone || "-"}</td>
                  <td className="px-2 py-2">{s.address || "-"}</td>
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
