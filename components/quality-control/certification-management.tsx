"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import type { QcCertificationEntry, QcCertificationStatus } from "@/lib/types";

type Props = { entries: QcCertificationEntry[]; language: Language };
type Form = Omit<QcCertificationEntry, "id" | "createdAt" | "updatedAt" | "createdBy">;
const EMPTY: Form = { certificateNo: "", productSku: "", productName: "", region: "", standardName: "", certBody: "", status: "planning", applicationDate: null, issueDate: null, expiryDate: null, reportUrl: "", owner: "", notes: "" };

export function CertificationManagement({ entries }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [message, setMessage] = useState("");

  function edit(e: QcCertificationEntry) { setEditingId(e.id); setForm({ certificateNo: e.certificateNo, productSku: e.productSku, productName: e.productName, region: e.region, standardName: e.standardName, certBody: e.certBody, status: e.status, applicationDate: e.applicationDate, issueDate: e.issueDate, expiryDate: e.expiryDate, reportUrl: e.reportUrl, owner: e.owner, notes: e.notes }); }
  function reset() { setEditingId(null); setForm(EMPTY); setMessage(""); }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const res = await fetch(editingId ? `/api/quality-control/certifications/${editingId}` : "/api/quality-control/certifications", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) return setMessage(data.message || "Request failed");
    reset(); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/quality-control/certifications/${id}`, { method: "DELETE" });
    if (!res.ok) return setMessage("Delete failed");
    if (id === editingId) reset();
    router.refresh();
  }
  return <div className="space-y-4"><section className="app-card p-5"><form className="grid gap-3 md:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Certificate no *" required value={form.certificateNo} onChange={(e) => setForm((f) => ({ ...f, certificateNo: e.target.value.toUpperCase() }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Product SKU *" required value={form.productSku} onChange={(e) => setForm((f) => ({ ...f, productSku: e.target.value.toUpperCase() }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Product name" value={form.productName} onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Region" value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Standard name" value={form.standardName} onChange={(e) => setForm((f) => ({ ...f, standardName: e.target.value }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Certification body" value={form.certBody} onChange={(e) => setForm((f) => ({ ...f, certBody: e.target.value }))} />
    <select className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as QcCertificationStatus }))}><option value="planning">planning</option><option value="in_progress">in_progress</option><option value="approved">approved</option><option value="expired">expired</option><option value="withdrawn">withdrawn</option></select>
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Owner" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
    <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.applicationDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, applicationDate: e.target.value || null }))} />
    <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.issueDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value || null }))} />
    <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.expiryDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value || null }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Report URL" value={form.reportUrl} onChange={(e) => setForm((f) => ({ ...f, reportUrl: e.target.value }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-4" placeholder="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
    <div className="lg:col-span-4 flex gap-2"><button className="rounded-lg bg-app-accent px-4 py-2 text-sm text-white">{editingId ? "Save" : "Create"}</button>{editingId ? <button type="button" className="rounded-lg border border-app-border px-4 py-2 text-sm" onClick={reset}>Cancel</button> : null}</div>
  </form>{message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}</section><section className="app-table-shell mt-4 overflow-x-auto"><table className="app-table min-w-[1100px]"><thead><tr><th className="px-2 py-2">Cert no</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2">Standard</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Expiry</th><th className="px-2 py-2">Owner</th><th className="px-2 py-2">Actions</th></tr></thead><tbody>{entries.map((e) => <tr key={e.id}><td className="px-2 py-2">{e.certificateNo}</td><td className="px-2 py-2">{e.productSku}</td><td className="px-2 py-2">{e.standardName || "-"}</td><td className="px-2 py-2">{e.status}</td><td className="px-2 py-2">{e.expiryDate || "-"}</td><td className="px-2 py-2">{e.owner || "-"}</td><td className="px-2 py-2"><div className="flex gap-2"><button type="button" className="app-button-secondary px-2 py-1 text-xs" onClick={() => edit(e)}>Edit</button><button type="button" className="app-button-secondary text-red-600 px-2 py-1 text-xs" onClick={() => remove(e.id)}>Delete</button></div></td></tr>)}</tbody></table></section></div>;
}
