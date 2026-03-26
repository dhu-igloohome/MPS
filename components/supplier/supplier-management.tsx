"use client";

import { useState } from "react";
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
    title: language === "en" ? "Supplier Management" : "供应商管理",
    name: language === "en" ? "Supplier name" : "供应商名称",
    address: language === "en" ? "Address" : "地址",
    contactName: language === "en" ? "Contact person" : "联系人",
    contactPhone: language === "en" ? "Phone" : "电话",
    create: language === "en" ? "Create supplier" : "新增供应商",
    empty: language === "en" ? "No suppliers yet." : "暂无供应商。",
  };

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, address, contactName, contactPhone }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || "Request failed");
      return;
    }
    setName("");
    setAddress("");
    setContactName("");
    setContactPhone("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder={t.name} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder={t.contactName} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder={t.contactPhone} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.address} className="rounded-lg border border-app-border px-3 py-2 text-sm" />
          <div className="md:col-span-2">
            <button type="submit" disabled={loading || !name.trim()} className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60">{t.create}</button>
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border/80 text-left text-app-muted">
                <th className="px-2 py-2">{t.name}</th>
                <th className="px-2 py-2">{t.contactName}</th>
                <th className="px-2 py-2">{t.contactPhone}</th>
                <th className="px-2 py-2">{t.address}</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td className="px-2 py-6 text-center text-app-muted" colSpan={4}>{t.empty}</td></tr>
              ) : suppliers.map((s) => (
                <tr key={s.id} className="border-b border-app-border/35">
                  <td className="px-2 py-2">{s.name}</td>
                  <td className="px-2 py-2">{s.contactName || "-"}</td>
                  <td className="px-2 py-2">{s.contactPhone || "-"}</td>
                  <td className="px-2 py-2">{s.address || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

