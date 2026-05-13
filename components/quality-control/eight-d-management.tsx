"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import type { Qc8dReportEntry, Qc8dSeverity, Qc8dStatus } from "@/lib/types";

type Props = { entries: Qc8dReportEntry[]; language: Language };
type Form = Omit<Qc8dReportEntry, "id" | "createdAt" | "updatedAt" | "createdBy">;
const EMPTY: Form = { reportNo: "", issueTitle: "", productSku: "", customer: "", region: "", severity: "S3", status: "open", owner: "", d3Containment: "", d4RootCause: "", d5CorrectiveAction: "", d6ImplementationPlan: "", dateOpened: null, dateClosed: null, affectedQuantity: 0, costImpact: 0, remarks: "" };

export function EightDManagement({ entries }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [message, setMessage] = useState("");
  function edit(e: Qc8dReportEntry) { setEditingId(e.id); setForm({ reportNo: e.reportNo, issueTitle: e.issueTitle, productSku: e.productSku, customer: e.customer, region: e.region, severity: e.severity, status: e.status, owner: e.owner, d3Containment: e.d3Containment, d4RootCause: e.d4RootCause, d5CorrectiveAction: e.d5CorrectiveAction, d6ImplementationPlan: e.d6ImplementationPlan, dateOpened: e.dateOpened, dateClosed: e.dateClosed, affectedQuantity: e.affectedQuantity, costImpact: e.costImpact, remarks: e.remarks }); }
  function reset() { setEditingId(null); setForm(EMPTY); setMessage(""); }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const res = await fetch(editingId ? `/api/quality-control/eight-d/${editingId}` : "/api/quality-control/eight-d", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) return setMessage(data.message || "Request failed");
    reset(); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/quality-control/eight-d/${id}`, { method: "DELETE" });
    if (!res.ok) return setMessage("Delete failed");
    if (id === editingId) reset();
    router.refresh();
  }

  return <div className="space-y-4"><section className="app-card p-5"><form className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4" onSubmit={submit}>
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="8D no *" required value={form.reportNo} onChange={(e) => setForm((f) => ({ ...f, reportNo: e.target.value.toUpperCase() }))} />
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Issue title *" required value={form.issueTitle} onChange={(e) => setForm((f) => ({ ...f, issueTitle: e.target.value }))} />
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Product SKU *" required value={form.productSku} onChange={(e) => setForm((f) => ({ ...f, productSku: e.target.value.toUpperCase() }))} />
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Customer" value={form.customer} onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))} />
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Region" value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} />
    <select className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Qc8dSeverity }))}><option value="S1">S1</option><option value="S2">S2</option><option value="S3">S3</option><option value="S4">S4</option></select>
    <select className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Qc8dStatus }))}><option value="open">open</option><option value="containment">containment</option><option value="root_caused">root_caused</option><option value="implemented">implemented</option><option value="verified">verified</option><option value="closed">closed</option></select>
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Owner" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-2" placeholder="D3 containment" value={form.d3Containment} onChange={(e) => setForm((f) => ({ ...f, d3Containment: e.target.value }))} />
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-2" placeholder="D4 root cause" value={form.d4RootCause} onChange={(e) => setForm((f) => ({ ...f, d4RootCause: e.target.value }))} />
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-2" placeholder="D5 corrective action" value={form.d5CorrectiveAction} onChange={(e) => setForm((f) => ({ ...f, d5CorrectiveAction: e.target.value }))} />
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-2" placeholder="D6 implementation plan" value={form.d6ImplementationPlan} onChange={(e) => setForm((f) => ({ ...f, d6ImplementationPlan: e.target.value }))} />
    <input type="date" className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" value={form.dateOpened ?? ""} onChange={(e) => setForm((f) => ({ ...f, dateOpened: e.target.value || null }))} />
    <input type="date" className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" value={form.dateClosed ?? ""} onChange={(e) => setForm((f) => ({ ...f, dateClosed: e.target.value || null }))} />
    <input type="number" min={0} className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Affected qty" value={form.affectedQuantity} onChange={(e) => setForm((f) => ({ ...f, affectedQuantity: Number(e.target.value) || 0 }))} />
    <input type="number" min={0} step="0.01" className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Cost impact" value={form.costImpact} onChange={(e) => setForm((f) => ({ ...f, costImpact: Number(e.target.value) || 0 }))} />
    <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm sm:col-span-2 md:col-span-3 lg:col-span-4" placeholder="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
    <div className="flex min-w-0 gap-2 sm:col-span-2 md:col-span-3 lg:col-span-4"><button className="rounded-lg bg-app-accent px-4 py-2 text-sm text-white">{editingId ? "Save" : "Create"}</button>{editingId ? <button type="button" className="rounded-lg border border-app-border px-4 py-2 text-sm" onClick={reset}>Cancel</button> : null}</div>
  </form>{message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}</section><section className="app-table-shell mt-4 overflow-x-auto"><table className="app-table min-w-[1000px]"><thead><tr><th className="px-2 py-2">8D no</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2">Severity</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Owner</th><th className="px-2 py-2">Actions</th></tr></thead><tbody>{entries.map((e) => <tr key={e.id}><td className="px-2 py-2">{e.reportNo}</td><td className="px-2 py-2">{e.productSku}</td><td className="px-2 py-2">{e.severity}</td><td className="px-2 py-2">{e.status}</td><td className="px-2 py-2">{e.owner || "-"}</td><td className="px-2 py-2"><div className="flex gap-2"><button type="button" className="app-button-secondary px-2 py-1 text-xs" onClick={() => edit(e)}>Edit</button><button type="button" className="app-button-secondary text-red-600 px-2 py-1 text-xs" onClick={() => remove(e.id)}>Delete</button></div></td></tr>)}</tbody></table></section></div>;
}
