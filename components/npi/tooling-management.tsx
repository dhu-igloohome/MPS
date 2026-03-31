"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import type { ToolingEntry, ToolingStatus, ToolingType } from "@/lib/types";

type Props = { entries: ToolingEntry[]; language: Language };
type Form = {
  toolingCode: string; toolingName: string; toolingType: ToolingType; relatedSku: string; cmName: string; location: string;
  status: ToolingStatus; owner: string; manufacturer: string; startUseDate: string; cycleCount: string; cycleLimit: string;
  lastMaintenanceDate: string; nextMaintenanceDue: string; cost: string; currency: string; remarks: string;
};

const DEFAULT_FORM: Form = {
  toolingCode: "", toolingName: "", toolingType: "fixture", relatedSku: "", cmName: "", location: "",
  status: "design", owner: "", manufacturer: "", startUseDate: "", cycleCount: "", cycleLimit: "",
  lastMaintenanceDate: "", nextMaintenanceDue: "", cost: "", currency: "USD", remarks: "",
};

export function ToolingManagement({ entries, language }: Props) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "Tooling & Fixture Management" : "工装夹具管理",
    create: language === "en" ? "Create tooling item" : "新增工装",
    save: language === "en" ? "Save" : "保存",
    cancel: language === "en" ? "Cancel" : "取消",
    edit: language === "en" ? "Edit" : "编辑",
    remove: language === "en" ? "Delete" : "删除",
    empty: language === "en" ? "No tooling items yet." : "暂无工装数据。",
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const editing = useMemo(() => entries.find((e) => e.id === editingId) ?? null, [editingId, entries]);

  function startEdit(e: ToolingEntry) {
    setEditingId(e.id);
    setForm({
      toolingCode: e.toolingCode, toolingName: e.toolingName, toolingType: e.toolingType, relatedSku: e.relatedSku,
      cmName: e.cmName, location: e.location, status: e.status, owner: e.owner, manufacturer: e.manufacturer,
      startUseDate: e.startUseDate ?? "", cycleCount: String(e.cycleCount), cycleLimit: String(e.cycleLimit),
      lastMaintenanceDate: e.lastMaintenanceDate ?? "", nextMaintenanceDue: e.nextMaintenanceDue ?? "",
      cost: String(e.cost), currency: e.currency, remarks: e.remarks,
    });
    setMessage("");
  }
  function reset() { setEditingId(null); setForm(DEFAULT_FORM); setMessage(""); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cycleCount = form.cycleCount === "" ? 0 : Number(form.cycleCount);
    const cycleLimit = form.cycleLimit === "" ? 0 : Number(form.cycleLimit);
    const cost = form.cost === "" ? 0 : Number(form.cost);
    if ([cycleCount, cycleLimit, cost].some((n) => Number.isNaN(n) || n < 0)) return setMessage("Invalid numeric fields");

    setLoading(true); setMessage("");
    const url = editingId ? `/api/npi/tooling/${encodeURIComponent(editingId)}` : "/api/npi/tooling";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, cycleCount, cycleLimit, cost }) });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) return setMessage(data.message || "Request failed");
    reset(); router.refresh();
  }
  async function onDelete(id: string) {
    if (!confirm(language === "en" ? "Delete this tooling item?" : "确定删除该工装？")) return;
    setLoading(true); setMessage("");
    const res = await fetch(`/api/npi/tooling/${encodeURIComponent(id)}`, { method: "DELETE" });
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
        {editing ? <p className="mt-1 text-xs text-app-muted">Editing: {editing.toolingCode}</p> : null}
        <form className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4" onSubmit={onSubmit}>
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.toolingCode} onChange={(e) => setForm((f) => ({ ...f, toolingCode: e.target.value.toUpperCase() }))} placeholder="Tooling code *" required />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.toolingName} onChange={(e) => setForm((f) => ({ ...f, toolingName: e.target.value }))} placeholder="Tooling name *" required />
          <select className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.toolingType} onChange={(e) => setForm((f) => ({ ...f, toolingType: e.target.value as ToolingType }))}>
            <option value="mold">mold</option><option value="fixture">fixture</option><option value="gauge">gauge</option><option value="tester">tester</option>
          </select>
          <select className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ToolingStatus }))}>
            <option value="design">design</option><option value="in_use">in_use</option><option value="maintenance">maintenance</option><option value="scrapped">scrapped</option>
          </select>
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.relatedSku} onChange={(e) => setForm((f) => ({ ...f, relatedSku: e.target.value.toUpperCase() }))} placeholder="Related SKU" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.cmName} onChange={(e) => setForm((f) => ({ ...f, cmName: e.target.value }))} placeholder="CM / Factory" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="Location" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.owner} onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))} placeholder="Owner" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.manufacturer} onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))} placeholder="Manufacturer" />
          <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.startUseDate} onChange={(e) => setForm((f) => ({ ...f, startUseDate: e.target.value }))} />
          <input type="number" min={0} step={1} className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.cycleCount} onChange={(e) => setForm((f) => ({ ...f, cycleCount: e.target.value }))} placeholder="Cycle count (0 = not tracked)" />
          <input type="number" min={0} step={1} className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.cycleLimit} onChange={(e) => setForm((f) => ({ ...f, cycleLimit: e.target.value }))} placeholder="Cycle limit (0 = no limit)" />
          <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.lastMaintenanceDate} onChange={(e) => setForm((f) => ({ ...f, lastMaintenanceDate: e.target.value }))} />
          <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.nextMaintenanceDue} onChange={(e) => setForm((f) => ({ ...f, nextMaintenanceDue: e.target.value }))} />
          <input type="number" min={0} step="0.01" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.cost} onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))} placeholder="Cost (optional)" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} placeholder="Currency" />
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
          <table className="w-full min-w-[1300px] border-collapse text-sm">
            <thead><tr className="border-b border-app-border/80 text-left text-app-muted"><th className="px-2 py-2">Code</th><th className="px-2 py-2">Name</th><th className="px-2 py-2">Type</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2">CM</th><th className="px-2 py-2">Cycles</th><th className="px-2 py-2">Cost</th><th className="px-2 py-2">Next Maint.</th><th className="px-2 py-2">Actions</th></tr></thead>
            <tbody>
              {entries.length === 0 ? <tr><td colSpan={10} className="px-2 py-6 text-center text-app-muted">{t.empty}</td></tr> : entries.map((e) => (
                <tr key={e.id} className="border-b border-app-border/35">
                  <td className="px-2 py-2">{e.toolingCode}</td><td className="px-2 py-2">{e.toolingName}</td><td className="px-2 py-2">{e.toolingType}</td><td className="px-2 py-2">{e.status}</td>
                  <td className="px-2 py-2">{e.relatedSku || "-"}</td>
                  <td className="px-2 py-2">{e.cmName || "-"}</td>
                  <td className="px-2 py-2">{e.cycleCount === 0 && e.cycleLimit === 0 ? "-" : `${e.cycleCount}/${e.cycleLimit || "∞"}`}</td>
                  <td className="px-2 py-2">{e.cost === 0 ? "-" : `${e.currency} ${e.cost.toFixed(2)}`}</td>
                  <td className="px-2 py-2">{e.nextMaintenanceDue || "-"}</td>
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

