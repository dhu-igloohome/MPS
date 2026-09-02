"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ccDate,
  ccInputMd,
  ccInputSm,
  ccSelectSm,
} from "@/components/shared/field-controls";
import type { Language } from "@/lib/i18n";
import type { SopEntry, SopStatus } from "@/lib/types";

type Props = { entries: SopEntry[]; language: Language };
type Form = Omit<SopEntry, "id" | "createdBy" | "createdAt" | "updatedAt">;

const DEFAULT_FORM: Form = {
  sopNo: "",
  title: "",
  productLine: "",
  sku: "",
  processStep: "",
  workstation: "",
  owner: "",
  reviewer: "",
  approver: "",
  status: "draft",
  version: "V1.0",
  effectiveDate: null,
  trainingRequired: false,
  safetyNotes: "",
  keyCtq: "",
  controlMethod: "",
  attachmentUrl: "",
  remarks: "",
};

export function SopManagement({ entries, language }: Props) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "SOP Management" : "SOP 管理",
    subtitle:
      language === "en"
        ? "Standard operating procedures for NPI and production — version, review, and training tracking."
        : "NPI 与量产标准作业程序：版本、评审与培训要求跟踪。",
    create: language === "en" ? "Create SOP" : "新增 SOP",
    save: language === "en" ? "Save" : "保存",
    cancel: language === "en" ? "Cancel" : "取消",
    edit: language === "en" ? "Edit" : "编辑",
    remove: language === "en" ? "Delete" : "删除",
    empty: language === "en" ? "No SOP entries yet." : "暂无 SOP 数据。",
    confirmDelete: language === "en" ? "Delete this SOP?" : "确定删除该 SOP？",
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SopStatus>("all");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const editing = useMemo(() => entries.find((e) => e.id === editingId) ?? null, [editingId, entries]);
  const filteredEntries = useMemo(() => {
    const q = query.trim().toLowerCase();
    const ownerQ = ownerFilter.trim().toLowerCase();
    return entries.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (ownerQ && !(e.owner || "").toLowerCase().includes(ownerQ)) return false;
      if (!q) return true;
      return [e.sopNo, e.title, e.sku, e.processStep, e.workstation].some((v) =>
        (v || "").toLowerCase().includes(q),
      );
    });
  }, [entries, query, statusFilter, ownerFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / pageSize));
  const pageEntries = useMemo(() => {
    const current = Math.min(page, totalPages);
    const start = (current - 1) * pageSize;
    return filteredEntries.slice(start, start + pageSize);
  }, [filteredEntries, page, totalPages]);
  const releasedCount = useMemo(() => entries.filter((e) => e.status === "released").length, [entries]);
  const inReviewCount = useMemo(() => entries.filter((e) => e.status === "in_review").length, [entries]);
  const trainingRequiredCount = useMemo(
    () => entries.filter((e) => e.trainingRequired && e.status !== "obsolete").length,
    [entries],
  );
  const expiringSoonCount = useMemo(() => {
    const now = new Date();
    const plus30 = new Date(now);
    plus30.setDate(plus30.getDate() + 30);
    return entries.filter((e) => {
      if (e.status !== "released" || !e.effectiveDate) return false;
      const d = new Date(e.effectiveDate);
      return !Number.isNaN(d.getTime()) && d >= now && d <= plus30;
    }).length;
  }, [entries]);

  function startEdit(e: SopEntry) {
    setEditingId(e.id);
    setForm({
      sopNo: e.sopNo,
      title: e.title,
      productLine: e.productLine,
      sku: e.sku,
      processStep: e.processStep,
      workstation: e.workstation,
      owner: e.owner,
      reviewer: e.reviewer,
      approver: e.approver,
      status: e.status,
      version: e.version,
      effectiveDate: e.effectiveDate,
      trainingRequired: e.trainingRequired,
      safetyNotes: e.safetyNotes,
      keyCtq: e.keyCtq,
      controlMethod: e.controlMethod,
      attachmentUrl: e.attachmentUrl,
      remarks: e.remarks,
    });
    setMessage("");
  }

  function reset() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setMessage("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch(editingId ? `/api/npi/sop/${encodeURIComponent(editingId)}` : "/api/npi/sop", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) return setMessage(data.message || "Request failed");
    reset();
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm(t.confirmDelete)) return;
    setLoading(true);
    const res = await fetch(`/api/npi/sop/${encodeURIComponent(id)}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) return setMessage("Delete failed");
    if (editingId === id) reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="app-card min-w-0 p-5">
          <p className="text-sm text-app-muted">{language === "en" ? "Released SOP" : "已发布 SOP"}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{releasedCount}</p>
        </div>
        <div className="app-card min-w-0 p-5">
          <p className="text-sm text-app-muted">{language === "en" ? "In Review SOP" : "审核中 SOP"}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{inReviewCount}</p>
        </div>
        <div className="app-card min-w-0 p-5">
          <p className="text-sm text-app-muted">{language === "en" ? "Training Required SOP" : "需培训 SOP"}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{trainingRequiredCount}</p>
        </div>
        <div className="app-card min-w-0 p-5">
          <p className="text-sm text-app-muted">{language === "en" ? "30-Day Effective Warning" : "30 天生效预警"}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{expiringSoonCount}</p>
        </div>
      </section>
      <section className="app-card p-5">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        <details className="mt-1 text-sm text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {language === "en" ? "About SOP" : "SOP 说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.subtitle}</p>
        </details>
        {editing ? (
          <p className="mt-2 text-xs text-app-muted">
            {language === "en" ? "Editing" : "编辑中"}: {editing.sopNo}
          </p>
        ) : null}
        <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={onSubmit}>
          <input
            className={ccInputSm}
            value={form.sopNo}
            onChange={(e) => setForm((f) => ({ ...f, sopNo: e.target.value.toUpperCase() }))}
            placeholder="SOP No *"
            required
          />
          <input
            className={ccInputMd}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Title *"
            required
          />
          <input
            className={ccInputMd}
            value={form.productLine}
            onChange={(e) => setForm((f) => ({ ...f, productLine: e.target.value }))}
            placeholder="Product line"
          />
          <input
            className={ccInputSm}
            value={form.sku}
            onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value.toUpperCase() }))}
            placeholder="SKU *"
            required
          />
          <input
            className={ccInputMd}
            value={form.processStep}
            onChange={(e) => setForm((f) => ({ ...f, processStep: e.target.value }))}
            placeholder="Process step"
          />
          <input
            className={ccInputMd}
            value={form.workstation}
            onChange={(e) => setForm((f) => ({ ...f, workstation: e.target.value }))}
            placeholder="Workstation"
          />
          <input
            className={ccInputSm}
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
            placeholder="Owner"
          />
          <input
            className={ccInputSm}
            value={form.reviewer}
            onChange={(e) => setForm((f) => ({ ...f, reviewer: e.target.value }))}
            placeholder="Reviewer"
          />
          <input
            className={ccInputSm}
            value={form.approver}
            onChange={(e) => setForm((f) => ({ ...f, approver: e.target.value }))}
            placeholder="Approver"
          />
          <select
            className={ccSelectSm}
            value={form.status}
            title={language === "en" ? "Status" : "状态"}
            aria-label={language === "en" ? "Status" : "状态"}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as SopStatus }))}
          >
            <option value="draft">draft</option>
            <option value="in_review">in_review</option>
            <option value="released">released</option>
            <option value="obsolete">obsolete</option>
          </select>
          <input
            className={ccInputSm}
            value={form.version}
            onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
            placeholder="Version"
          />
          <input
            type="date"
            className={ccDate}
            value={form.effectiveDate ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value || null }))}
            title={language === "en" ? "Effective date" : "生效日期"}
          />
          <label className="flex shrink-0 items-center gap-2 rounded-lg border border-app-border px-2 py-1.5 text-xs">
            <input
              type="checkbox"
              checked={form.trainingRequired}
              onChange={(e) => setForm((f) => ({ ...f, trainingRequired: e.target.checked }))}
            />
            {language === "en" ? "Training required" : "需培训"}
          </label>
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            value={form.keyCtq}
            onChange={(e) => setForm((f) => ({ ...f, keyCtq: e.target.value }))}
            placeholder="Key CTQ"
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            value={form.controlMethod}
            onChange={(e) => setForm((f) => ({ ...f, controlMethod: e.target.value }))}
            placeholder={language === "en" ? "Control method" : "控制方法"}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            value={form.safetyNotes}
            onChange={(e) => setForm((f) => ({ ...f, safetyNotes: e.target.value }))}
            placeholder={language === "en" ? "Safety notes" : "安全注意事项"}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            value={form.attachmentUrl}
            onChange={(e) => setForm((f) => ({ ...f, attachmentUrl: e.target.value }))}
            placeholder={language === "en" ? "Attachment URL" : "附件链接"}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
            placeholder="Remarks"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60"
          >
            {editingId ? t.save : t.create}
          </button>
          {editingId ? (
            <button type="button" onClick={reset} className="shrink-0 rounded-lg border border-app-border px-4 py-2 text-sm">
              {t.cancel}
            </button>
          ) : null}
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>

      <section className="app-card p-5">
        <div className="mb-3 flex flex-wrap items-end gap-x-3 gap-y-2">
          <input
            className={`${ccInputMd} max-w-[16rem]`}
            placeholder={language === "en" ? "Search SOP / title / SKU" : "搜索 SOP/标题/SKU"}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <select
            className={ccSelectSm}
            value={statusFilter}
            title={language === "en" ? "Filter by status" : "按状态筛选"}
            aria-label={language === "en" ? "Filter by status" : "按状态筛选"}
            onChange={(e) => {
              setStatusFilter(e.target.value as "all" | SopStatus);
              setPage(1);
            }}
          >
            <option value="all">All status</option>
            <option value="draft">draft</option>
            <option value="in_review">in_review</option>
            <option value="released">released</option>
            <option value="obsolete">obsolete</option>
          </select>
          <input
            className={ccInputSm}
            placeholder={language === "en" ? "Owner" : "负责人"}
            value={ownerFilter}
            onChange={(e) => {
              setOwnerFilter(e.target.value);
              setPage(1);
            }}
          />
          <span className="shrink-0 rounded-lg border border-app-border px-2 py-1.5 text-xs text-app-muted">
            {filteredEntries.length} {language === "en" ? "records" : "条记录"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="app-table min-w-[1200px]">
            <thead>
              <tr className="border-b border-app-border/80 text-left text-app-muted">
                <th className="px-2 py-2">SOP No</th>
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Step</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Version</th>
                <th className="px-2 py-2">Effective</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-2 py-6 text-center text-app-muted">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                pageEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-2 py-2">{e.sopNo}</td>
                    <td className="px-2 py-2">{e.title}</td>
                    <td className="px-2 py-2">{e.sku}</td>
                    <td className="px-2 py-2">{e.processStep || "-"}</td>
                    <td className="px-2 py-2">{e.owner || "-"}</td>
                    <td className="px-2 py-2">{e.status}</td>
                    <td className="px-2 py-2">{e.version || "-"}</td>
                    <td className="px-2 py-2">{e.effectiveDate || "-"}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button type="button" className="rounded border border-app-border px-2 py-1 text-xs" onClick={() => startEdit(e)}>
                          {t.edit}
                        </button>
                        <button
                          type="button"
                          className="rounded border border-red-200 px-2 py-1 text-xs text-red-600"
                          onClick={() => onDelete(e.id)}
                        >
                          {t.remove}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-sm">
          <button
            type="button"
            className="rounded border border-app-border px-2 py-1 disabled:opacity-50"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-app-muted">
            {page}/{totalPages}
          </span>
          <button
            type="button"
            className="rounded border border-app-border px-2 py-1 disabled:opacity-50"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
