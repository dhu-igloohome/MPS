"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import type { EcnEntry, EcnPriority, EcnStatus } from "@/lib/types";

type Props = { entries: EcnEntry[]; language: Language };
type Form = {
  ecnNo: string; title: string; status: EcnStatus; priority: EcnPriority; requester: string; owner: string;
  targetEffectiveDate: string; actualEffectiveDate: string; affectedSkus: string; impactSummary: string; reason: string; remarks: string;
};

const DEFAULT_FORM: Form = {
  ecnNo: "", title: "", status: "draft", priority: "medium", requester: "", owner: "",
  targetEffectiveDate: "", actualEffectiveDate: "", affectedSkus: "", impactSummary: "", reason: "", remarks: "",
};

export function EcnManagement({ entries, language }: Props) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "ECN Management" : "ECN 管理",
    create: language === "en" ? "Create ECN" : "新增 ECN",
    save: language === "en" ? "Save" : "保存",
    cancel: language === "en" ? "Cancel" : "取消",
    edit: language === "en" ? "Edit" : "编辑",
    remove: language === "en" ? "Delete" : "删除",
    empty: language === "en" ? "No ECN entries yet." : "暂无 ECN 数据。",
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const editing = useMemo(() => entries.find((e) => e.id === editingId) ?? null, [editingId, entries]);

  function startEdit(e: EcnEntry) {
    setEditingId(e.id);
    setForm({
      ecnNo: e.ecnNo, title: e.title, status: e.status, priority: e.priority, requester: e.requester, owner: e.owner,
      targetEffectiveDate: e.targetEffectiveDate ?? "", actualEffectiveDate: e.actualEffectiveDate ?? "",
      affectedSkus: e.affectedSkus, impactSummary: e.impactSummary, reason: e.reason, remarks: e.remarks,
    });
    setMessage("");
  }
  function reset() { setEditingId(null); setForm(DEFAULT_FORM); setMessage(""); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMessage("");
    const url = editingId ? `/api/npi/ecn/${encodeURIComponent(editingId)}` : "/api/npi/ecn";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) return setMessage(data.message || "Request failed");
    reset(); router.refresh();
  }
  async function onDelete(id: string) {
    if (!confirm(language === "en" ? "Delete this ECN?" : "确定删除该 ECN？")) return;
    setLoading(true); setMessage("");
    const res = await fetch(`/api/npi/ecn/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) return setMessage(data.message || "Delete failed");
    if (editingId === id) reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        {editing ? <p className="mt-1 text-xs text-app-muted">Editing: {editing.ecnNo}</p> : null}
        <form className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4" onSubmit={onSubmit}>
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.ecnNo} onChange={(e) => setForm((f) => ({ ...f, ecnNo: e.target.value.toUpperCase() }))} placeholder="ECN no *" required />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Title *" required />
          <select className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EcnStatus }))}>
            <option value="draft">draft</option><option value="under_review">under_review</option><option value="approved">approved</option><option value="implemented">implemented</option><option value="rejected">rejected</option>
          </select>
          <select className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as EcnPriority }))}>
            <option value="low">low</option><option value="medium">medium</option><option value="high">high</option>
          </select>
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.requester} onChange={(e) => setForm((f) => ({ ...f, requester: e.target.value }))} placeholder="Requester" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} placeholder="Owner" />
          <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.targetEffectiveDate} onChange={(e) => setForm((f) => ({ ...f, targetEffectiveDate: e.target.value }))} />
          <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.actualEffectiveDate} onChange={(e) => setForm((f) => ({ ...f, actualEffectiveDate: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-2" value={form.affectedSkus} onChange={(e) => setForm((f) => ({ ...f, affectedSkus: e.target.value }))} placeholder="Affected SKUs (comma-separated)" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-2" value={form.impactSummary} onChange={(e) => setForm((f) => ({ ...f, impactSummary: e.target.value }))} placeholder="Impact summary" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-4" value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="Reason" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-4" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Remarks" />
          <div className="lg:col-span-4 flex gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60">{editingId ? t.save : t.create}</button>
            {editingId ? <button type="button" className="rounded-lg border border-app-border px-4 py-2 text-sm" onClick={reset}>{t.cancel}</button> : null}
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse text-sm">
            <thead><tr className="border-b border-app-border/80 text-left text-app-muted"><th className="px-2 py-2">ECN No</th><th className="px-2 py-2">Title</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Priority</th><th className="px-2 py-2">Owner</th><th className="px-2 py-2">Target date</th><th className="px-2 py-2">Affected SKUs</th><th className="px-2 py-2">Actions</th></tr></thead>
            <tbody>
              {entries.length === 0 ? <tr><td colSpan={8} className="px-2 py-6 text-center text-app-muted">{t.empty}</td></tr> : entries.map((e) => (
                <tr key={e.id} className="border-b border-app-border/35">
                  <td className="px-2 py-2">{e.ecnNo}</td><td className="px-2 py-2">{e.title}</td><td className="px-2 py-2">{e.status}</td><td className="px-2 py-2">{e.priority}</td><td className="px-2 py-2">{e.owner || "-"}</td><td className="px-2 py-2">{e.targetEffectiveDate || "-"}</td><td className="px-2 py-2">{e.affectedSkus || "-"}</td>
                  <td className="px-2 py-2"><div className="flex gap-2"><button type="button" className="rounded border border-app-border px-2 py-1 text-xs" onClick={() => startEdit(e)}>{t.edit}</button><button type="button" className="rounded border border-red-200 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(e.id)}>{t.remove}</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

