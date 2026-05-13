"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import type { QcTestCaseEntry, QcTestCaseStatus, QcTestCasePriority, QcTestCaseCategory } from "@/lib/types";

import { Plus, Save, Trash2, Edit2 } from "lucide-react";

type Props = { entries: QcTestCaseEntry[]; language: Language };
type Form = Omit<QcTestCaseEntry, "id" | "createdAt" | "updatedAt" | "createdBy">;
const EMPTY: Form = { testCaseId: "", title: "", productSku: "", firmwareVersion: "", moduleName: "", category: "functional", priority: "P1", status: "draft", preconditions: "", steps: "", expectedResult: "", environment: "", owner: "", remarks: "" };

export function TestCaseManagement({ entries }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function edit(e: QcTestCaseEntry) {
    setEditingId(e.id);
    setForm({
      testCaseId: e.testCaseId,
      title: e.title,
      productSku: e.productSku,
      firmwareVersion: e.firmwareVersion,
      moduleName: e.moduleName,
      category: e.category,
      priority: e.priority,
      status: e.status,
      preconditions: e.preconditions,
      steps: e.steps,
      expectedResult: e.expectedResult,
      environment: e.environment,
      owner: e.owner,
      remarks: e.remarks,
    });
  }
  function reset() { setEditingId(null); setForm(EMPTY); setMessage(""); }
  async function submit(ev: React.FormEvent) {
    ev.preventDefault(); setLoading(true); setMessage("");
    const res = await fetch(editingId ? `/api/quality-control/test-cases/${editingId}` : "/api/quality-control/test-cases", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false); if (!res.ok) return setMessage(data.message || "Request failed"); reset(); router.refresh();
  }
  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    setLoading(true);
    const res = await fetch(`/api/quality-control/test-cases/${id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) return setMessage("Delete failed");
    if (editingId === id) reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="app-card p-5">
        <form className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={submit}>
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Test case ID *" required value={form.testCaseId} onChange={(e) => setForm((f) => ({ ...f, testCaseId: e.target.value.toUpperCase() }))} />
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Title *" required value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Product SKU *" required value={form.productSku} onChange={(e) => setForm((f) => ({ ...f, productSku: e.target.value.toUpperCase() }))} />
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="FW version" value={form.firmwareVersion} onChange={(e) => setForm((f) => ({ ...f, firmwareVersion: e.target.value }))} />
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Module" value={form.moduleName} onChange={(e) => setForm((f) => ({ ...f, moduleName: e.target.value }))} />
          <select className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as QcTestCaseCategory }))}><option value="functional">functional</option><option value="security">security</option><option value="reliability">reliability</option><option value="compatibility">compatibility</option><option value="ota">ota</option><option value="performance">performance</option></select>
          <select className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as QcTestCasePriority }))}><option value="P0">P0</option><option value="P1">P1</option><option value="P2">P2</option></select>
          <select className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as QcTestCaseStatus }))}><option value="draft">draft</option><option value="reviewed">reviewed</option><option value="released">released</option><option value="obsolete">obsolete</option></select>
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-2" placeholder="Preconditions" value={form.preconditions} onChange={(e) => setForm((f) => ({ ...f, preconditions: e.target.value }))} />
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-2" placeholder="Test steps" value={form.steps} onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))} />
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-2" placeholder="Expected result" value={form.expectedResult} onChange={(e) => setForm((f) => ({ ...f, expectedResult: e.target.value }))} />
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Environment" value={form.environment} onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))} />
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Owner" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} />
          <input className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-2" placeholder="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          <div className="flex min-w-0 gap-2 sm:col-span-2 lg:col-span-4"><button className="app-button-primary px-4 py-2 text-sm" disabled={loading} type="submit">{editingId ? <><Save className="h-4 w-4 mr-2 inline" />Save</> : <><Plus className="h-4 w-4 mr-2 inline" />Create</>}</button>{editingId ? <button type="button" className="app-button-secondary px-4 py-2 text-sm" onClick={reset}>Cancel</button> : null}</div>
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>
      <section className="app-table-shell mt-4 overflow-x-auto">
        <table className="app-table min-w-[1200px]"><thead><tr><th className="px-2 py-2">ID</th><th className="px-2 py-2">Title</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2">Category</th><th className="px-2 py-2">Priority</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Owner</th><th className="px-2 py-2">Actions</th></tr></thead><tbody>{entries.map((e) => <tr key={e.id}><td className="px-2 py-2">{e.testCaseId}</td><td className="px-2 py-2">{e.title}</td><td className="px-2 py-2">{e.productSku}</td><td className="px-2 py-2">{e.category}</td><td className="px-2 py-2">{e.priority}</td><td className="px-2 py-2">{e.status}</td><td className="px-2 py-2">{e.owner || "-"}</td><td className="px-2 py-2"><div className="flex gap-2"><button type="button" className="app-button-secondary px-2 py-1 text-xs" onClick={() => edit(e)}><Edit2 className="h-3 w-3 inline mr-1" />Edit</button><button type="button" className="app-button-secondary text-red-600 px-2 py-1 text-xs" onClick={() => remove(e.id)}><Trash2 className="h-3 w-3 inline mr-1" />Delete</button></div></td></tr>)}</tbody></table>
      </section>
    </div>
  );
}
