"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import type { QcOrtReportEntry, QcOrtResult } from "@/lib/types";

type Props = { entries: QcOrtReportEntry[]; language: Language };
type Form = Omit<QcOrtReportEntry, "id" | "createdAt" | "updatedAt" | "createdBy">;
const EMPTY: Form = { ortNo: "", productSku: "", batchNo: "", factory: "", sampleSize: 0, testItems: "", environmentProfile: "", duration: "", resultSummary: "on_going", failCount: 0, failModes: "", actionTaken: "", owner: "", startDate: null, endDate: null, reportUrl: "" };

export function OrtReportManagement({ entries }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [message, setMessage] = useState("");

  function edit(e: QcOrtReportEntry) { setEditingId(e.id); setForm({ ortNo: e.ortNo, productSku: e.productSku, batchNo: e.batchNo, factory: e.factory, sampleSize: e.sampleSize, testItems: e.testItems, environmentProfile: e.environmentProfile, duration: e.duration, resultSummary: e.resultSummary, failCount: e.failCount, failModes: e.failModes, actionTaken: e.actionTaken, owner: e.owner, startDate: e.startDate, endDate: e.endDate, reportUrl: e.reportUrl }); }
  function reset() { setEditingId(null); setForm(EMPTY); setMessage(""); }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    const res = await fetch(editingId ? `/api/quality-control/ort-reports/${editingId}` : "/api/quality-control/ort-reports", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) return setMessage(data.message || "Request failed");
    reset(); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    const res = await fetch(`/api/quality-control/ort-reports/${id}`, { method: "DELETE" });
    if (!res.ok) return setMessage("Delete failed");
    if (id === editingId) reset();
    router.refresh();
  }

  return <div className="space-y-4"><section className="app-card p-5"><form className="grid gap-3 md:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="ORT no *" required value={form.ortNo} onChange={(e) => setForm((f) => ({ ...f, ortNo: e.target.value.toUpperCase() }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Product SKU *" required value={form.productSku} onChange={(e) => setForm((f) => ({ ...f, productSku: e.target.value.toUpperCase() }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Batch no" value={form.batchNo} onChange={(e) => setForm((f) => ({ ...f, batchNo: e.target.value }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Factory" value={form.factory} onChange={(e) => setForm((f) => ({ ...f, factory: e.target.value }))} />
    <input type="number" min={0} className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Sample size" value={form.sampleSize} onChange={(e) => setForm((f) => ({ ...f, sampleSize: Number(e.target.value) || 0 }))} />
    <select className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.resultSummary} onChange={(e) => setForm((f) => ({ ...f, resultSummary: e.target.value as QcOrtResult }))}><option value="on_going">on_going</option><option value="pass">pass</option><option value="fail">fail</option></select>
    <input type="number" min={0} className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Fail count" value={form.failCount} onChange={(e) => setForm((f) => ({ ...f, failCount: Number(e.target.value) || 0 }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Owner" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-2" placeholder="Test items" value={form.testItems} onChange={(e) => setForm((f) => ({ ...f, testItems: e.target.value }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-2" placeholder="Environment profile" value={form.environmentProfile} onChange={(e) => setForm((f) => ({ ...f, environmentProfile: e.target.value }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Duration" value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Fail modes" value={form.failModes} onChange={(e) => setForm((f) => ({ ...f, failModes: e.target.value }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-2" placeholder="Action taken" value={form.actionTaken} onChange={(e) => setForm((f) => ({ ...f, actionTaken: e.target.value }))} />
    <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.startDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value || null }))} />
    <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.endDate ?? ""} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || null }))} />
    <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-2" placeholder="Report URL" value={form.reportUrl} onChange={(e) => setForm((f) => ({ ...f, reportUrl: e.target.value }))} />
    <div className="lg:col-span-4 flex gap-2"><button className="rounded-lg bg-app-accent px-4 py-2 text-sm text-white">{editingId ? "Save" : "Create"}</button>{editingId ? <button type="button" className="rounded-lg border border-app-border px-4 py-2 text-sm" onClick={reset}>Cancel</button> : null}</div>
  </form>{message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}</section><section className="app-table-shell mt-4 overflow-x-auto"><table className="app-table min-w-[1000px]"><thead><tr><th className="px-2 py-2">ORT no</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2">Result</th><th className="px-2 py-2">Fail count</th><th className="px-2 py-2">Owner</th><th className="px-2 py-2">Actions</th></tr></thead><tbody>{entries.map((e) => <tr key={e.id}><td className="px-2 py-2">{e.ortNo}</td><td className="px-2 py-2">{e.productSku}</td><td className="px-2 py-2">{e.resultSummary}</td><td className="px-2 py-2">{e.failCount}</td><td className="px-2 py-2">{e.owner || "-"}</td><td className="px-2 py-2"><div className="flex gap-2"><button type="button" className="app-button-secondary px-2 py-1 text-xs" onClick={() => edit(e)}>Edit</button><button type="button" className="app-button-secondary text-red-600 px-2 py-1 text-xs" onClick={() => remove(e.id)}>Delete</button></div></td></tr>)}</tbody></table></section></div>;
}
