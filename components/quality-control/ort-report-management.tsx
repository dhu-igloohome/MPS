"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ccDate,
  ccInputMd,
  ccInputSm,
  ccNum,
  ccSelectSm,
} from "@/components/cost-control/cost-control-form-controls";
import type { Language } from "@/lib/i18n";
import type { QcOrtReportEntry, QcOrtResult } from "@/lib/types";

type Props = { entries: QcOrtReportEntry[]; language: Language };
type Form = Omit<QcOrtReportEntry, "id" | "createdAt" | "updatedAt" | "createdBy">;

const EMPTY: Form = {
  ortNo: "",
  productSku: "",
  batchNo: "",
  factory: "",
  sampleSize: 0,
  testItems: "",
  environmentProfile: "",
  duration: "",
  resultSummary: "on_going",
  failCount: 0,
  failModes: "",
  actionTaken: "",
  owner: "",
  startDate: null,
  endDate: null,
  reportUrl: "",
};

export function OrtReportManagement({ entries, language }: Props) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "ORT Report Management" : "ORT 报告管理",
    subtitle:
      language === "en"
        ? "Track ongoing reliability test (ORT) runs, sample sizes, results, and corrective actions."
        : "跟踪可靠性试验（ORT）批次、样品数量、结果与纠正措施。",
    create: language === "en" ? "Create" : "创建",
    save: language === "en" ? "Save" : "保存",
    cancel: language === "en" ? "Cancel" : "取消",
    edit: language === "en" ? "Edit" : "编辑",
    remove: language === "en" ? "Delete" : "删除",
    confirmDelete: language === "en" ? "Delete this ORT report?" : "确定删除该 ORT 报告？",
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const editing = useMemo(() => entries.find((e) => e.id === editingId) ?? null, [editingId, entries]);

  function edit(e: QcOrtReportEntry) {
    setEditingId(e.id);
    setForm({
      ortNo: e.ortNo,
      productSku: e.productSku,
      batchNo: e.batchNo,
      factory: e.factory,
      sampleSize: e.sampleSize,
      testItems: e.testItems,
      environmentProfile: e.environmentProfile,
      duration: e.duration,
      resultSummary: e.resultSummary,
      failCount: e.failCount,
      failModes: e.failModes,
      actionTaken: e.actionTaken,
      owner: e.owner,
      startDate: e.startDate,
      endDate: e.endDate,
      reportUrl: e.reportUrl,
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
      editingId ? `/api/quality-control/ort-reports/${editingId}` : "/api/quality-control/ort-reports",
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
    const res = await fetch(`/api/quality-control/ort-reports/${id}`, { method: "DELETE" });
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
            {language === "en" ? "About ORT reports" : "ORT 报告说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.subtitle}</p>
        </details>
        {editing ? (
          <p className="mt-2 text-xs text-app-muted">
            {language === "en" ? "Editing" : "编辑中"}: {editing.ortNo}
          </p>
        ) : null}
        <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={submit}>
          <input
            className={ccInputSm}
            placeholder="ORT no *"
            required
            value={form.ortNo}
            onChange={(e) => setForm((f) => ({ ...f, ortNo: e.target.value.toUpperCase() }))}
          />
          <input
            className={ccInputSm}
            placeholder="Product SKU *"
            required
            value={form.productSku}
            onChange={(e) => setForm((f) => ({ ...f, productSku: e.target.value.toUpperCase() }))}
          />
          <input
            className={ccInputSm}
            placeholder="Batch no"
            value={form.batchNo}
            onChange={(e) => setForm((f) => ({ ...f, batchNo: e.target.value }))}
          />
          <input
            className={ccInputMd}
            placeholder="Factory"
            value={form.factory}
            onChange={(e) => setForm((f) => ({ ...f, factory: e.target.value }))}
          />
          <input
            type="number"
            min={0}
            className={ccNum}
            placeholder="Sample size"
            value={form.sampleSize}
            onChange={(e) => setForm((f) => ({ ...f, sampleSize: Number(e.target.value) || 0 }))}
            title={language === "en" ? "Sample size" : "样品数量"}
          />
          <select
            className={ccSelectSm}
            value={form.resultSummary}
            title={language === "en" ? "Result" : "结果"}
            aria-label={language === "en" ? "Result" : "结果"}
            onChange={(e) => setForm((f) => ({ ...f, resultSummary: e.target.value as QcOrtResult }))}
          >
            <option value="on_going">on_going</option>
            <option value="pass">pass</option>
            <option value="fail">fail</option>
          </select>
          <input
            type="number"
            min={0}
            className={ccNum}
            placeholder="Fail count"
            value={form.failCount}
            onChange={(e) => setForm((f) => ({ ...f, failCount: Number(e.target.value) || 0 }))}
            title={language === "en" ? "Fail count" : "失效数量"}
          />
          <input
            className={ccInputSm}
            placeholder="Owner"
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Test items"
            value={form.testItems}
            onChange={(e) => setForm((f) => ({ ...f, testItems: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Environment profile"
            value={form.environmentProfile}
            onChange={(e) => setForm((f) => ({ ...f, environmentProfile: e.target.value }))}
          />
          <input
            className={ccInputSm}
            placeholder="Duration"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
          />
          <input
            className={ccInputMd}
            placeholder="Fail modes"
            value={form.failModes}
            onChange={(e) => setForm((f) => ({ ...f, failModes: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Action taken"
            value={form.actionTaken}
            onChange={(e) => setForm((f) => ({ ...f, actionTaken: e.target.value }))}
          />
          <input
            type="date"
            className={ccDate}
            value={form.startDate ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value || null }))}
            title={language === "en" ? "Start date" : "开始日期"}
          />
          <input
            type="date"
            className={ccDate}
            value={form.endDate ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value || null }))}
            title={language === "en" ? "End date" : "结束日期"}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Report URL"
            value={form.reportUrl}
            onChange={(e) => setForm((f) => ({ ...f, reportUrl: e.target.value }))}
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
                <th className="px-2 py-2">ORT no</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Result</th>
                <th className="px-2 py-2">Fail count</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-2 py-2">{e.ortNo}</td>
                  <td className="px-2 py-2">{e.productSku}</td>
                  <td className="px-2 py-2">{e.resultSummary}</td>
                  <td className="px-2 py-2">{e.failCount}</td>
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
