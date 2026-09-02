"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ccDate,
  ccInputMd,
  ccInputSm,
  ccNum,
  ccSelectSm,
} from "@/components/shared/field-controls";
import type { Language } from "@/lib/i18n";
import type { Qc8dReportEntry, Qc8dSeverity, Qc8dStatus } from "@/lib/types";

type Props = { entries: Qc8dReportEntry[]; language: Language };
type Form = Omit<Qc8dReportEntry, "id" | "createdAt" | "updatedAt" | "createdBy">;

const EMPTY: Form = {
  reportNo: "",
  issueTitle: "",
  productSku: "",
  customer: "",
  region: "",
  severity: "S3",
  status: "open",
  owner: "",
  d3Containment: "",
  d4RootCause: "",
  d5CorrectiveAction: "",
  d6ImplementationPlan: "",
  dateOpened: null,
  dateClosed: null,
  affectedQuantity: 0,
  costImpact: 0,
  remarks: "",
};

export function EightDManagement({ entries, language }: Props) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "8D Report Management" : "8D 报告管理",
    subtitle:
      language === "en"
        ? "Track 8D problem-solving reports from containment through verification and closure."
        : "跟踪 8D 问题解决报告：从围堵、根因到验证与结案。",
    create: language === "en" ? "Create" : "创建",
    save: language === "en" ? "Save" : "保存",
    cancel: language === "en" ? "Cancel" : "取消",
    edit: language === "en" ? "Edit" : "编辑",
    remove: language === "en" ? "Delete" : "删除",
    confirmDelete: language === "en" ? "Delete this 8D report?" : "确定删除该 8D 报告？",
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const editing = useMemo(() => entries.find((e) => e.id === editingId) ?? null, [editingId, entries]);

  function edit(e: Qc8dReportEntry) {
    setEditingId(e.id);
    setForm({
      reportNo: e.reportNo,
      issueTitle: e.issueTitle,
      productSku: e.productSku,
      customer: e.customer,
      region: e.region,
      severity: e.severity,
      status: e.status,
      owner: e.owner,
      d3Containment: e.d3Containment,
      d4RootCause: e.d4RootCause,
      d5CorrectiveAction: e.d5CorrectiveAction,
      d6ImplementationPlan: e.d6ImplementationPlan,
      dateOpened: e.dateOpened,
      dateClosed: e.dateClosed,
      affectedQuantity: e.affectedQuantity,
      costImpact: e.costImpact,
      remarks: e.remarks,
    });
    setMessage("");
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY);
    setMessage("");
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch(
      editingId ? `/api/quality-control/eight-d/${editingId}` : "/api/quality-control/eight-d",
      { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) },
    );
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) return setMessage(data.message || "Request failed");
    reset();
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm(t.confirmDelete)) return;
    setLoading(true);
    const res = await fetch(`/api/quality-control/eight-d/${id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) return setMessage("Delete failed");
    if (id === editingId) reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="app-card p-5">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        <details className="mt-1 text-sm text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {language === "en" ? "About 8D" : "8D 说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.subtitle}</p>
        </details>
        {editing ? (
          <p className="mt-2 text-xs text-app-muted">
            {language === "en" ? "Editing" : "编辑中"}: {editing.reportNo}
          </p>
        ) : null}
        <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={submit}>
          <input
            className={ccInputSm}
            placeholder="8D no *"
            required
            value={form.reportNo}
            onChange={(e) => setForm((f) => ({ ...f, reportNo: e.target.value.toUpperCase() }))}
          />
          <input
            className={ccInputMd}
            placeholder="Issue title *"
            required
            value={form.issueTitle}
            onChange={(e) => setForm((f) => ({ ...f, issueTitle: e.target.value }))}
          />
          <input
            className={ccInputSm}
            placeholder="Product SKU *"
            required
            value={form.productSku}
            onChange={(e) => setForm((f) => ({ ...f, productSku: e.target.value.toUpperCase() }))}
          />
          <input
            className={ccInputMd}
            placeholder="Customer"
            value={form.customer}
            onChange={(e) => setForm((f) => ({ ...f, customer: e.target.value }))}
          />
          <input
            className={ccInputSm}
            placeholder="Region"
            value={form.region}
            onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
          />
          <select
            className={ccSelectSm}
            value={form.severity}
            title={language === "en" ? "Severity" : "严重度"}
            aria-label={language === "en" ? "Severity" : "严重度"}
            onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as Qc8dSeverity }))}
          >
            <option value="S1">S1</option>
            <option value="S2">S2</option>
            <option value="S3">S3</option>
            <option value="S4">S4</option>
          </select>
          <select
            className={ccSelectSm}
            value={form.status}
            title={language === "en" ? "Status" : "状态"}
            aria-label={language === "en" ? "Status" : "状态"}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Qc8dStatus }))}
          >
            <option value="open">open</option>
            <option value="containment">containment</option>
            <option value="root_caused">root_caused</option>
            <option value="implemented">implemented</option>
            <option value="verified">verified</option>
            <option value="closed">closed</option>
          </select>
          <input
            className={ccInputSm}
            placeholder="Owner"
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="D3 containment"
            value={form.d3Containment}
            onChange={(e) => setForm((f) => ({ ...f, d3Containment: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="D4 root cause"
            value={form.d4RootCause}
            onChange={(e) => setForm((f) => ({ ...f, d4RootCause: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="D5 corrective action"
            value={form.d5CorrectiveAction}
            onChange={(e) => setForm((f) => ({ ...f, d5CorrectiveAction: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="D6 implementation plan"
            value={form.d6ImplementationPlan}
            onChange={(e) => setForm((f) => ({ ...f, d6ImplementationPlan: e.target.value }))}
          />
          <input
            type="date"
            className={ccDate}
            value={form.dateOpened ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, dateOpened: e.target.value || null }))}
            title={language === "en" ? "Date opened" : "开启日期"}
          />
          <input
            type="date"
            className={ccDate}
            value={form.dateClosed ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, dateClosed: e.target.value || null }))}
            title={language === "en" ? "Date closed" : "关闭日期"}
          />
          <input
            type="number"
            min={0}
            className={ccNum}
            placeholder="Affected qty"
            value={form.affectedQuantity}
            onChange={(e) => setForm((f) => ({ ...f, affectedQuantity: Number(e.target.value) || 0 }))}
            title={language === "en" ? "Affected quantity" : "影响数量"}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            className={ccNum}
            placeholder="Cost impact"
            value={form.costImpact}
            onChange={(e) => setForm((f) => ({ ...f, costImpact: Number(e.target.value) || 0 }))}
            title={language === "en" ? "Cost impact" : "成本影响"}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Remarks"
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60"
          >
            {editingId ? t.save : t.create}
          </button>
          {editingId ? (
            <button
              type="button"
              className="shrink-0 rounded-lg border border-app-border px-4 py-2 text-sm"
              onClick={reset}
            >
              {t.cancel}
            </button>
          ) : null}
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>
      <section className="app-card p-5">
        <div className="app-table-shell overflow-x-auto">
          <table className="app-table min-w-[1000px]">
            <thead>
              <tr>
                <th className="px-2 py-2">8D no</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Severity</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-2 py-2">{e.reportNo}</td>
                  <td className="px-2 py-2">{e.productSku}</td>
                  <td className="px-2 py-2">{e.severity}</td>
                  <td className="px-2 py-2">{e.status}</td>
                  <td className="px-2 py-2">{e.owner || "-"}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button type="button" className="app-button-secondary px-2 py-1 text-xs" onClick={() => edit(e)}>
                        {t.edit}
                      </button>
                      <button
                        type="button"
                        className="app-button-secondary px-2 py-1 text-xs text-red-600"
                        onClick={() => remove(e.id)}
                      >
                        {t.remove}
                      </button>
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
