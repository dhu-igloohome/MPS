"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ccDate,
  ccInputMd,
  ccInputSm,
  ccSelectSm,
} from "@/components/cost-control/cost-control-form-controls";
import type { Language } from "@/lib/i18n";
import type { QcCertificationEntry, QcCertificationStatus } from "@/lib/types";

type Props = { entries: QcCertificationEntry[]; language: Language };
type Form = Omit<QcCertificationEntry, "id" | "createdAt" | "updatedAt" | "createdBy">;

const EMPTY: Form = {
  certificateNo: "",
  productSku: "",
  productName: "",
  region: "",
  standardName: "",
  certBody: "",
  status: "planning",
  applicationDate: null,
  issueDate: null,
  expiryDate: null,
  reportUrl: "",
  owner: "",
  notes: "",
};

export function CertificationManagement({ entries, language }: Props) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "Certification Management" : "认证管理",
    subtitle:
      language === "en"
        ? "Track product certifications, standards, validity dates, and report links by region."
        : "按区域跟踪产品认证、标准、有效期与报告链接。",
    create: language === "en" ? "Create" : "创建",
    save: language === "en" ? "Save" : "保存",
    cancel: language === "en" ? "Cancel" : "取消",
    edit: language === "en" ? "Edit" : "编辑",
    remove: language === "en" ? "Delete" : "删除",
    confirmDelete: language === "en" ? "Delete this certification?" : "确定删除该认证记录？",
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const editing = useMemo(() => entries.find((e) => e.id === editingId) ?? null, [editingId, entries]);

  function edit(e: QcCertificationEntry) {
    setEditingId(e.id);
    setForm({
      certificateNo: e.certificateNo,
      productSku: e.productSku,
      productName: e.productName,
      region: e.region,
      standardName: e.standardName,
      certBody: e.certBody,
      status: e.status,
      applicationDate: e.applicationDate,
      issueDate: e.issueDate,
      expiryDate: e.expiryDate,
      reportUrl: e.reportUrl,
      owner: e.owner,
      notes: e.notes,
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
      editingId ? `/api/quality-control/certifications/${editingId}` : "/api/quality-control/certifications",
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
    const res = await fetch(`/api/quality-control/certifications/${id}`, { method: "DELETE" });
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
            {language === "en" ? "About certifications" : "认证说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.subtitle}</p>
        </details>
        {editing ? (
          <p className="mt-2 text-xs text-app-muted">
            {language === "en" ? "Editing" : "编辑中"}: {editing.certificateNo}
          </p>
        ) : null}
        <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={submit}>
          <input
            className={ccInputSm}
            placeholder="Certificate no *"
            required
            value={form.certificateNo}
            onChange={(e) => setForm((f) => ({ ...f, certificateNo: e.target.value.toUpperCase() }))}
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
            placeholder="Product name"
            value={form.productName}
            onChange={(e) => setForm((f) => ({ ...f, productName: e.target.value }))}
          />
          <input
            className={ccInputSm}
            placeholder="Region"
            value={form.region}
            onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
          />
          <input
            className={ccInputMd}
            placeholder="Standard name"
            value={form.standardName}
            onChange={(e) => setForm((f) => ({ ...f, standardName: e.target.value }))}
          />
          <input
            className={ccInputMd}
            placeholder="Certification body"
            value={form.certBody}
            onChange={(e) => setForm((f) => ({ ...f, certBody: e.target.value }))}
          />
          <select
            className={ccSelectSm}
            value={form.status}
            title={language === "en" ? "Status" : "状态"}
            aria-label={language === "en" ? "Status" : "状态"}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as QcCertificationStatus }))}
          >
            <option value="planning">planning</option>
            <option value="in_progress">in_progress</option>
            <option value="approved">approved</option>
            <option value="expired">expired</option>
            <option value="withdrawn">withdrawn</option>
          </select>
          <input
            className={ccInputSm}
            placeholder="Owner"
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
          />
          <input
            type="date"
            className={ccDate}
            value={form.applicationDate ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, applicationDate: e.target.value || null }))}
            title={language === "en" ? "Application date" : "申请日期"}
          />
          <input
            type="date"
            className={ccDate}
            value={form.issueDate ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value || null }))}
            title={language === "en" ? "Issue date" : "签发日期"}
          />
          <input
            type="date"
            className={ccDate}
            value={form.expiryDate ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, expiryDate: e.target.value || null }))}
            title={language === "en" ? "Expiry date" : "到期日期"}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Report URL"
            value={form.reportUrl}
            onChange={(e) => setForm((f) => ({ ...f, reportUrl: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
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
          <table className="app-table min-w-[1100px]">
            <thead>
              <tr>
                <th className="px-2 py-2">Cert no</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Standard</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Expiry</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-2 py-2">{e.certificateNo}</td>
                  <td className="px-2 py-2">{e.productSku}</td>
                  <td className="px-2 py-2">{e.standardName || "-"}</td>
                  <td className="px-2 py-2">{e.status}</td>
                  <td className="px-2 py-2">{e.expiryDate || "-"}</td>
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
