"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ccInputMd,
  ccInputSm,
  ccLabel,
  ccSelectMd,
  ccSelectSm,
} from "@/components/cost-control/cost-control-form-controls";
import {
  canUserActAsEcnApprover,
  ECN_APPROVAL_DEPARTMENTS,
  ECN_CHANGE_TEAMS,
  ECN_FINISHED_GOODS_OPTIONS,
  ECN_MATERIAL_STOCK_OPTIONS,
  ECN_PRODUCTION_LINE_OPTIONS,
  type EcnApprovalDepartment,
  type EcnChangeTeam,
} from "@/lib/ecn-approval-config";
import { contractFileTypeError } from "@/lib/contract-file-upload-policy";
import type { Language } from "@/lib/i18n";
import type {
  EcnApprovalEntry,
  EcnApprovalStatus,
  EcnFinishedGoodsDisposition,
  EcnMaterialStockDisposition,
  EcnProductionLineDisposition,
  ProductItem,
  UserRole,
} from "@/lib/types";

type Props = {
  entries: EcnApprovalEntry[];
  products: ProductItem[];
  language: Language;
  username: string;
  role: UserRole;
};

type FormState = {
  sku: string;
  variant: string;
  changeTeam: EcnChangeTeam | "";
  changeReason: string;
  jiraLinks: string[];
  importBatch: string;
  materialStockDisposition: EcnMaterialStockDisposition | "";
  productionLineDisposition: EcnProductionLineDisposition | "";
  finishedGoodsDisposition: EcnFinishedGoodsDisposition | "";
  comments: string;
  productionFilesUrl: string;
  approvalDepartment: EcnApprovalDepartment | "";
};

const EMPTY_FORM: FormState = {
  sku: "",
  variant: "",
  changeTeam: "",
  changeReason: "",
  jiraLinks: [""],
  importBatch: "",
  materialStockDisposition: "",
  productionLineDisposition: "",
  finishedGoodsDisposition: "",
  comments: "",
  productionFilesUrl: "",
  approvalDepartment: "",
};

function statusBadge(status: EcnApprovalStatus) {
  if (status === "draft") return "bg-amber-50 text-amber-800 ring-amber-200";
  if (status === "under_review") return "bg-sky-50 text-sky-800 ring-sky-200";
  if (status === "approved") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  return "bg-rose-50 text-rose-800 ring-rose-200";
}

export function EcnApprovalFlow({ entries, products, language, username, role }: Props) {
  const router = useRouter();
  const en = language === "en";
  const activeProducts = useMemo(() => products.filter((p) => p.isActive), [products]);
  const skuOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of activeProducts) {
      const s = p.sku.trim();
      if (s) set.add(s);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [activeProducts]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | EcnApprovalStatus>("all");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const variantOptions = useMemo(() => {
    if (!form.sku.trim()) return [];
    const set = new Set<string>();
    for (const p of activeProducts) {
      if (p.sku === form.sku && p.variant.trim()) set.add(p.variant.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [activeProducts, form.sku]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false;
      if (!q) return true;
      return [e.ecnNo, e.sku, e.productName, e.createdBy].some((v) =>
        (v || "").toLowerCase().includes(q),
      );
    });
  }, [entries, query, statusFilter]);

  function entryToForm(e: EcnApprovalEntry): FormState {
    return {
      sku: e.sku,
      variant: e.variant,
      changeTeam: e.changeTeam,
      changeReason: e.changeReason,
      jiraLinks: e.jiraLinks.length ? e.jiraLinks : [""],
      importBatch: e.importBatch,
      materialStockDisposition: e.materialStockDisposition,
      productionLineDisposition: e.productionLineDisposition,
      finishedGoodsDisposition: e.finishedGoodsDisposition,
      comments: e.comments,
      productionFilesUrl: e.productionFilesUrl,
      approvalDepartment: e.approvalDepartment,
    };
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPendingFiles([]);
    setMessage("");
  }

  function bodyFromForm() {
    return {
      ...form,
      jiraLinks: form.jiraLinks.map((s) => s.trim()).filter(Boolean),
    };
  }

  async function uploadFiles(requestId: string, files: File[]) {
    for (const file of files) {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch(`/api/npi/ecn/${encodeURIComponent(requestId)}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Attachment upload failed");
      }
    }
  }

  async function onSaveDraft(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const url = editingId ? `/api/npi/ecn/${encodeURIComponent(editingId)}` : "/api/npi/ecn";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyFromForm()),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; entry?: EcnApprovalEntry };
      if (!res.ok) throw new Error(data.message || "Save failed");
      const id = data.entry?.id ?? editingId;
      if (id && pendingFiles.length) await uploadFiles(id, pendingFiles);
      setPendingFiles([]);
      setMessage(en ? "Draft saved." : "草稿已保存。");
      if (!editingId && data.entry) {
        setEditingId(data.entry.id);
      }
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Save failed");
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitForApproval(id: string) {
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/npi/ecn/${encodeURIComponent(id)}/submit`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || (en ? "Submit failed." : "提交失败。"));
      return;
    }
    setMessage(en ? "Submitted for approval." : "已提交审批。");
    resetForm();
    router.refresh();
  }

  async function onApprove(id: string) {
    setLoading(true);
    const res = await fetch(`/api/npi/ecn/${encodeURIComponent(id)}/approve`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || (en ? "Approve failed." : "审批失败。"));
      return;
    }
    setMessage(en ? "Approved." : "已通过。");
    router.refresh();
  }

  async function onReject(id: string) {
    if (!rejectReason.trim()) {
      setMessage(en ? "Enter rejection reason." : "请填写驳回原因。");
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/npi/ecn/${encodeURIComponent(id)}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || (en ? "Reject failed." : "驳回失败。"));
      return;
    }
    setRejectingId(null);
    setRejectReason("");
    setMessage(en ? "Rejected." : "已驳回。");
    router.refresh();
  }

  const deptOptions = (Object.keys(ECN_APPROVAL_DEPARTMENTS) as EcnApprovalDepartment[]).map((key) => ({
    key,
    label: en ? ECN_APPROVAL_DEPARTMENTS[key].labelEn : ECN_APPROVAL_DEPARTMENTS[key].labelZh,
    approvers: ECN_APPROVAL_DEPARTMENTS[key].approvers.join(", "),
  }));

  return (
    <div className="min-w-0 space-y-4">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">
          {en ? "ECN Approval Flow" : "ECN 审批流"}
        </h3>
        <details className="mt-1 text-sm text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {en ? "How it works" : "说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">
            {en
              ? "Replaces DingTalk ECN approval. SKU from Product Database (required). Variant optional. ECN number is auto-generated on save. Department approvers must all approve (co-sign)."
              : "替代钉钉 ECN 审批。SKU 来自产品数据库（必填），变体可选；保存后自动生成 ECN 编号；所选部门审批人须全部通过（会签）。"}
          </p>
          <ul className="mt-2 list-inside list-disc text-xs">
            {deptOptions.map((d) => (
              <li key={d.key}>
                {d.label}: {d.approvers}
              </li>
            ))}
          </ul>
        </details>

        <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={onSaveDraft}>
          <label className="shrink-0">
            <span className={ccLabel}>{en ? "SKU" : "SKU"} *</span>
            <select
              className={ccSelectSm}
              required
              value={form.sku}
              onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value, variant: "" }))}
            >
              <option value="">{en ? "Select SKU" : "选择 SKU"}</option>
              {skuOptions.map((sku) => (
                <option key={sku} value={sku}>
                  {sku}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{en ? "Variant" : "变体"}</span>
            <select
              className={ccSelectSm}
              value={form.variant}
              onChange={(e) => setForm((f) => ({ ...f, variant: e.target.value }))}
              disabled={!form.sku}
            >
              <option value="">{en ? "(optional)" : "（可选）"}</option>
              {variantOptions.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{en ? "Change team" : "变更归属"} *</span>
            <select
              className={ccSelectSm}
              required
              value={form.changeTeam}
              onChange={(e) => setForm((f) => ({ ...f, changeTeam: e.target.value as EcnChangeTeam }))}
            >
              <option value="">{en ? "Select" : "请选择"}</option>
              {(Object.keys(ECN_CHANGE_TEAMS) as EcnChangeTeam[]).map((k) => (
                <option key={k} value={k}>
                  {en ? ECN_CHANGE_TEAMS[k].labelEn : ECN_CHANGE_TEAMS[k].labelZh}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{en ? "Department" : "所在部门"} *</span>
            <select
              className={ccSelectMd}
              required
              value={form.approvalDepartment}
              onChange={(e) =>
                setForm((f) => ({ ...f, approvalDepartment: e.target.value as EcnApprovalDepartment }))
              }
            >
              <option value="">{en ? "Select" : "请选择"}</option>
              {deptOptions.map((d) => (
                <option key={d.key} value={d.key}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[16rem] shrink-0 basis-full sm:basis-auto">
            <span className={ccLabel}>{en ? "Change reason" : "变更原因"} *</span>
            <input
              className={ccInputMd}
              value={form.changeReason}
              onChange={(e) => setForm((f) => ({ ...f, changeReason: e.target.value }))}
              placeholder={
                en
                  ? "Optimize / replace / fix / upgrade / new + description"
                  : "优化/替换/解决/升级/新增 + 描述（中英文）"
              }
              required
            />
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{en ? "Import batch" : "导入批次"} *</span>
            <input
              className={ccInputMd}
              value={form.importBatch}
              onChange={(e) => setForm((f) => ({ ...f, importBatch: e.target.value }))}
              required
            />
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{en ? "Material in stock" : "物料库存"} *</span>
            <select
              className={ccSelectMd}
              required
              value={form.materialStockDisposition}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  materialStockDisposition: e.target.value as EcnMaterialStockDisposition,
                }))
              }
            >
              <option value="">{en ? "Select" : "请选择"}</option>
              {(Object.keys(ECN_MATERIAL_STOCK_OPTIONS) as EcnMaterialStockDisposition[]).map((k) => (
                <option key={k} value={k}>
                  {en ? ECN_MATERIAL_STOCK_OPTIONS[k].labelEn : ECN_MATERIAL_STOCK_OPTIONS[k].labelZh}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{en ? "Line material" : "产线物料"} *</span>
            <select
              className={ccSelectMd}
              required
              value={form.productionLineDisposition}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  productionLineDisposition: e.target.value as EcnProductionLineDisposition,
                }))
              }
            >
              <option value="">{en ? "Select" : "请选择"}</option>
              {(Object.keys(ECN_PRODUCTION_LINE_OPTIONS) as EcnProductionLineDisposition[]).map((k) => (
                <option key={k} value={k}>
                  {en ? ECN_PRODUCTION_LINE_OPTIONS[k].labelEn : ECN_PRODUCTION_LINE_OPTIONS[k].labelZh}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{en ? "Finished goods" : "成品库存"} *</span>
            <select
              className={ccSelectMd}
              required
              value={form.finishedGoodsDisposition}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  finishedGoodsDisposition: e.target.value as EcnFinishedGoodsDisposition,
                }))
              }
            >
              <option value="">{en ? "Select" : "请选择"}</option>
              {(Object.keys(ECN_FINISHED_GOODS_OPTIONS) as EcnFinishedGoodsDisposition[]).map((k) => (
                <option key={k} value={k}>
                  {en ? ECN_FINISHED_GOODS_OPTIONS[k].labelEn : ECN_FINISHED_GOODS_OPTIONS[k].labelZh}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[14rem] shrink-0 basis-full lg:basis-auto">
            <span className={ccLabel}>{en ? "Production files (URL)" : "生产资料链接"} *</span>
            <input
              className={ccInputMd}
              value={form.productionFilesUrl}
              onChange={(e) => setForm((f) => ({ ...f, productionFilesUrl: e.target.value }))}
              placeholder={en ? "BOM or FW link in R&D-release" : "R&D-release 中 BOM/FW 链接"}
              required
            />
          </label>
          <div className="w-full shrink-0 basis-full">
            <span className={ccLabel}>{en ? "JIRA links" : "JIRA 链接"} *</span>
            <div className="mt-1 space-y-1">
              {form.jiraLinks.map((link, idx) => (
                <div key={idx} className="flex flex-wrap items-center gap-2">
                  <input
                    className={ccInputMd}
                    value={link}
                    onChange={(e) =>
                      setForm((f) => {
                        const next = [...f.jiraLinks];
                        next[idx] = e.target.value;
                        return { ...f, jiraLinks: next };
                      })
                    }
                    placeholder={en ? "One link per line" : "一行一条链接"}
                  />
                  {form.jiraLinks.length > 1 ? (
                    <button
                      type="button"
                      className="text-xs text-rose-600"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          jiraLinks: f.jiraLinks.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      {en ? "Remove" : "删除"}
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="text-xs font-medium text-app-accent"
                onClick={() => setForm((f) => ({ ...f, jiraLinks: [...f.jiraLinks, ""] }))}
              >
                + {en ? "Add link" : "添加链接"}
              </button>
            </div>
          </div>
          <label className="min-w-[14rem] shrink-0 basis-full">
            <span className={ccLabel}>{en ? "Comments" : "其他备注"}</span>
            <input
              className={ccInputMd}
              value={form.comments}
              onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
            />
          </label>
          <label className="min-w-[12rem] shrink-0">
            <span className={ccLabel}>{en ? "ECN attachments" : "ECN 附件"} *</span>
            <input
              type="file"
              multiple
              className="mt-0 block w-full max-w-xs text-sm file:mr-2 file:rounded-lg file:border file:border-app-border file:bg-white file:px-2 file:py-1"
              onChange={(e) => setPendingFiles([...(e.target.files ?? [])])}
            />
            <p className="mt-0.5 text-xs text-app-muted">{contractFileTypeError(language)}</p>
            {editingId && entries.find((x) => x.id === editingId)?.attachments.length ? (
              <p className="text-xs text-app-muted">
                {en ? "Saved files:" : "已上传："}
                {entries
                  .find((x) => x.id === editingId)!
                  .attachments.map((a) => a.fileName)
                  .join(", ")}
              </p>
            ) : null}
          </label>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg border-2 border-app-accent bg-app-accent-soft px-3.5 py-2 text-sm font-semibold text-app-accent disabled:opacity-50"
            >
              {loading ? (en ? "Saving…" : "保存中…") : en ? "Save draft" : "保存草稿"}
            </button>
            {editingId ? (
              <button
                type="button"
                disabled={loading}
                className="rounded-lg border border-app-border px-3.5 py-2 text-sm font-medium hover:bg-app-accent-soft disabled:opacity-50"
                onClick={() => onSubmitForApproval(editingId)}
              >
                {en ? "Submit for approval" : "提交审批"}
              </button>
            ) : null}
            <button
              type="button"
              className="rounded-lg border border-app-border px-3 py-2 text-sm text-app-muted hover:bg-app-accent-soft"
              onClick={resetForm}
            >
              {en ? "Clear" : "清空"}
            </button>
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-app-muted">{message}</p> : null}
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="shrink-0">
            <span className={ccLabel}>{en ? "Search" : "搜索"}</span>
            <input className={ccInputSm} value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{en ? "Status" : "状态"}</span>
            <select
              className={ccSelectSm}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | EcnApprovalStatus)}
            >
              <option value="all">{en ? "All" : "全部"}</option>
              <option value="draft">{en ? "Draft" : "草稿"}</option>
              <option value="under_review">{en ? "Under review" : "审批中"}</option>
              <option value="approved">{en ? "Approved" : "已通过"}</option>
              <option value="rejected">{en ? "Rejected" : "已驳回"}</option>
            </select>
          </label>
          <span className="text-xs text-app-muted">
            {filtered.length} {en ? "record(s)" : "条"}
          </span>
        </div>
        <div className="app-table-shell mt-3 overflow-x-auto">
          <table className="w-full min-w-[72rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border/80 text-left text-app-muted">
                <th className="px-2 py-2">ECN</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">{en ? "Dept" : "部门"}</th>
                <th className="px-2 py-2">{en ? "Status" : "状态"}</th>
                <th className="px-2 py-2">{en ? "Sign-offs" : "会签"}</th>
                <th className="px-2 py-2">{en ? "By" : "提交人"}</th>
                <th className="px-2 py-2">{en ? "Actions" : "操作"}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-8 text-center text-app-muted">
                    {en ? "No ECN requests yet." : "暂无 ECN 审批单。"}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const canApprove =
                    row.status === "under_review" &&
                    canUserActAsEcnApprover(username, row.approvalDepartment, role);
                  const pendingMine = row.signoffs.some(
                    (s) => s.approverUsername === username && s.decision === "pending",
                  );
                  const deptLabel = en
                    ? ECN_APPROVAL_DEPARTMENTS[row.approvalDepartment].labelEn
                    : ECN_APPROVAL_DEPARTMENTS[row.approvalDepartment].labelZh;
                  return (
                    <tr key={row.id} className="border-b border-app-border/50 align-top">
                      <td className="whitespace-nowrap px-2 py-2 font-medium">{row.ecnNo}</td>
                      <td className="px-2 py-2">
                        {row.sku}
                        {row.variant ? ` / ${row.variant}` : ""}
                      </td>
                      <td className="px-2 py-2">{deptLabel}</td>
                      <td className="px-2 py-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ${statusBadge(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-xs text-app-muted">
                        {row.signoffs.map((s) => `${s.approverUsername}:${s.decision}`).join(" · ") || "—"}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">{row.createdBy}</td>
                      <td className="px-2 py-2">
                        <div className="flex flex-wrap gap-1">
                          {row.status === "draft" && row.createdBy === username ? (
                            <button
                              type="button"
                              className="rounded border border-app-border px-2 py-0.5 text-xs hover:bg-app-accent-soft"
                              onClick={() => {
                                setEditingId(row.id);
                                setForm(entryToForm(row));
                                setPendingFiles([]);
                              }}
                            >
                              {en ? "Edit" : "编辑"}
                            </button>
                          ) : null}
                          {row.status === "draft" && row.createdBy === username ? (
                            <button
                              type="button"
                              disabled={loading}
                              className="rounded border border-app-accent px-2 py-0.5 text-xs text-app-accent hover:bg-app-accent-soft disabled:opacity-50"
                              onClick={() => onSubmitForApproval(row.id)}
                            >
                              {en ? "Submit" : "提交"}
                            </button>
                          ) : null}
                          {canApprove && (pendingMine || role === "super_admin") ? (
                            <button
                              type="button"
                              disabled={loading}
                              className="rounded border border-emerald-300 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                              onClick={() => onApprove(row.id)}
                            >
                              {en ? "Approve" : "通过"}
                            </button>
                          ) : null}
                          {canApprove && (pendingMine || role === "super_admin") ? (
                            <button
                              type="button"
                              className="rounded border border-rose-200 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-50"
                              onClick={() => setRejectingId(row.id)}
                            >
                              {en ? "Reject" : "驳回"}
                            </button>
                          ) : null}
                          {row.attachments.map((a) => (
                            <a
                              key={a.id}
                              href={`/api/npi/ecn/attachments/${encodeURIComponent(a.id)}/download`}
                              className="rounded border border-app-border px-2 py-0.5 text-xs text-app-accent hover:bg-app-accent-soft"
                            >
                              {a.fileName}
                            </a>
                          ))}
                        </div>
                        {rejectingId === row.id ? (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              className={ccInputSm}
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder={en ? "Rejection reason" : "驳回原因"}
                            />
                            <button
                              type="button"
                              className="text-xs text-rose-600"
                              disabled={loading}
                              onClick={() => onReject(row.id)}
                            >
                              {en ? "Confirm reject" : "确认驳回"}
                            </button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
