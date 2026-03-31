"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import type { BomEntry, BomStatus } from "@/lib/types";

type BomManagementProps = {
  entries: BomEntry[];
  language: Language;
};

type BomForm = {
  projectName: string;
  sku: string;
  bomVersion: string;
  status: BomStatus;
  effectiveDate: string;
  componentCode: string;
  componentName: string;
  specification: string;
  quantityPer: string;
  uom: string;
  supplierName: string;
  unitCost: string;
  moq: string;
  leadTimeDays: string;
  isCritical: boolean;
  remarks: string;
};

const DEFAULT_FORM: BomForm = {
  projectName: "",
  sku: "",
  bomVersion: "V1.0",
  status: "draft",
  effectiveDate: "",
  componentCode: "",
  componentName: "",
  specification: "",
  quantityPer: "",
  uom: "PCS",
  supplierName: "",
  unitCost: "",
  moq: "",
  leadTimeDays: "",
  isCritical: false,
  remarks: "",
};

export function BomManagement({ entries, language }: BomManagementProps) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "BOM Management" : "BOM 管理",
    subtitle:
      language === "en"
        ? "Maintain product BOM lines for small-team NPI operations."
        : "维护 NPI 阶段常用的产品 BOM 明细。",
    create: language === "en" ? "Create BOM line" : "新增 BOM 明细",
    save: language === "en" ? "Save" : "保存",
    cancel: language === "en" ? "Cancel" : "取消",
    edit: language === "en" ? "Edit" : "编辑",
    remove: language === "en" ? "Delete" : "删除",
    empty: language === "en" ? "No BOM entries yet." : "暂无 BOM 数据。",
    confirmDelete: language === "en" ? "Delete this BOM line?" : "确认删除该 BOM 明细？",
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<BomForm>(DEFAULT_FORM);

  const editing = useMemo(() => entries.find((e) => e.id === editingId) ?? null, [editingId, entries]);

  function startEdit(entry: BomEntry) {
    setEditingId(entry.id);
    setForm({
      projectName: entry.projectName,
      sku: entry.sku,
      bomVersion: entry.bomVersion,
      status: entry.status,
      effectiveDate: entry.effectiveDate ?? "",
      componentCode: entry.componentCode,
      componentName: entry.componentName,
      specification: entry.specification,
      quantityPer: String(entry.quantityPer),
      uom: entry.uom,
      supplierName: entry.supplierName,
      unitCost: String(entry.unitCost),
      moq: String(entry.moq),
      leadTimeDays: String(entry.leadTimeDays),
      isCritical: entry.isCritical,
      remarks: entry.remarks,
    });
    setMessage("");
  }

  function resetForm() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setMessage("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const quantityPer = form.quantityPer === "" ? 0 : Number(form.quantityPer);
    const unitCost = form.unitCost === "" ? 0 : Number(form.unitCost);
    const moq = form.moq === "" ? 0 : Number(form.moq);
    const leadTimeDays = form.leadTimeDays === "" ? 0 : Number(form.leadTimeDays);
    if ([quantityPer, unitCost, moq, leadTimeDays].some((n) => Number.isNaN(n) || n < 0)) {
      setMessage("Invalid numeric fields");
      return;
    }

    setLoading(true);
    setMessage("");
    const url = editingId ? `/api/npi/bom/${encodeURIComponent(editingId)}` : "/api/npi/bom";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        quantityPer,
        unitCost,
        moq,
        leadTimeDays,
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
    const res = await fetch(`/api/npi/bom/${encodeURIComponent(id)}`, { method: "DELETE" });
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
        <p className="mt-1 text-sm text-app-muted">{t.subtitle}</p>
        {editing ? <p className="mt-2 text-xs text-app-muted">Editing: {editing.sku} · {editing.componentCode}</p> : null}

        <form className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4" onSubmit={onSubmit}>
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.projectName} onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))} placeholder="Project name" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))} placeholder="SKU *" required />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.bomVersion} onChange={(e) => setForm((f) => ({ ...f, bomVersion: e.target.value }))} placeholder="BOM version" />
          <select className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as BomStatus }))}>
            <option value="draft">draft</option>
            <option value="released">released</option>
            <option value="obsolete">obsolete</option>
          </select>
          <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.componentCode} onChange={(e) => setForm((f) => ({ ...f, componentCode: e.target.value.toUpperCase() }))} placeholder="Component code *" required />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.componentName} onChange={(e) => setForm((f) => ({ ...f, componentName: e.target.value }))} placeholder="Component name *" required />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.specification} onChange={(e) => setForm((f) => ({ ...f, specification: e.target.value }))} placeholder="Specification" />
          <input type="number" min={0} step="0.0001" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.quantityPer} onChange={(e) => setForm((f) => ({ ...f, quantityPer: e.target.value }))} placeholder="Qty per (default 0)" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.uom} onChange={(e) => setForm((f) => ({ ...f, uom: e.target.value.toUpperCase() }))} placeholder="UOM" />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.supplierName} onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))} placeholder="Supplier name" />
          <input type="number" min={0} step="0.0001" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.unitCost} onChange={(e) => setForm((f) => ({ ...f, unitCost: e.target.value }))} placeholder="Unit cost (optional)" />
          <input type="number" min={0} step={1} className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.moq} onChange={(e) => setForm((f) => ({ ...f, moq: e.target.value }))} placeholder="MOQ (0 = no MOQ)" />
          <input type="number" min={0} step={1} className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.leadTimeDays} onChange={(e) => setForm((f) => ({ ...f, leadTimeDays: e.target.value }))} placeholder="Lead time days (0 = unknown)" />
          <label className="flex items-center gap-2 rounded-lg border border-app-border px-3 py-2 text-sm">
            <input type="checkbox" checked={form.isCritical} onChange={(e) => setForm((f) => ({ ...f, isCritical: e.target.checked }))} />
            Critical part
          </label>
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-4" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} placeholder="Remarks" />
          <div className="lg:col-span-4 flex gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60">
              {editingId ? t.save : t.create}
            </button>
            {editingId ? <button type="button" className="rounded-lg border border-app-border px-4 py-2 text-sm" onClick={resetForm}>{t.cancel}</button> : null}
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border/80 text-left text-app-muted">
                <th className="px-2 py-2">Project</th><th className="px-2 py-2">SKU</th><th className="px-2 py-2">Version</th><th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Effective</th><th className="px-2 py-2">Comp code</th><th className="px-2 py-2">Comp name</th>
                <th className="px-2 py-2">Qty</th><th className="px-2 py-2">UOM</th><th className="px-2 py-2">Supplier</th><th className="px-2 py-2">Unit cost</th>
                <th className="px-2 py-2">MOQ</th><th className="px-2 py-2">Lead days</th><th className="px-2 py-2">Critical</th><th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={15} className="px-2 py-6 text-center text-app-muted">{t.empty}</td></tr>
              ) : entries.map((e) => (
                <tr key={e.id} className="border-b border-app-border/35">
                  <td className="px-2 py-2">{e.projectName || "-"}</td><td className="px-2 py-2">{e.sku}</td><td className="px-2 py-2">{e.bomVersion || "-"}</td><td className="px-2 py-2">{e.status}</td>
                  <td className="px-2 py-2">{e.effectiveDate || "-"}</td><td className="px-2 py-2">{e.componentCode}</td><td className="px-2 py-2">{e.componentName}</td>
                  <td className="px-2 py-2">{e.quantityPer === 0 ? "-" : e.quantityPer}</td>
                  <td className="px-2 py-2">{e.uom}</td>
                  <td className="px-2 py-2">{e.supplierName || "-"}</td>
                  <td className="px-2 py-2">{e.unitCost === 0 ? "-" : e.unitCost.toFixed(4)}</td>
                  <td className="px-2 py-2">{e.moq === 0 ? "-" : e.moq}</td>
                  <td className="px-2 py-2">{e.leadTimeDays === 0 ? "-" : e.leadTimeDays}</td>
                  <td className="px-2 py-2">{e.isCritical ? "Y" : "N"}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button type="button" className="rounded border border-app-border px-2 py-1 text-xs" onClick={() => startEdit(e)}>{t.edit}</button>
                      <button type="button" className="rounded border border-red-200 px-2 py-1 text-xs text-red-600" onClick={() => onDelete(e.id)}>{t.remove}</button>
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

