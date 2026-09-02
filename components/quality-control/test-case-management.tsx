"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Edit2, Plus, Save, Trash2 } from "lucide-react";

import {
  ccInputMd,
  ccInputSm,
  ccSelectSm,
} from "@/components/shared/field-controls";
import type { Language } from "@/lib/i18n";
import type { QcTestCaseCategory, QcTestCaseEntry, QcTestCasePriority, QcTestCaseStatus } from "@/lib/types";

type Props = { entries: QcTestCaseEntry[]; language: Language };
type Form = Omit<QcTestCaseEntry, "id" | "createdAt" | "updatedAt" | "createdBy">;

const EMPTY: Form = {
  testCaseId: "",
  title: "",
  productSku: "",
  firmwareVersion: "",
  moduleName: "",
  category: "functional",
  priority: "P1",
  status: "draft",
  preconditions: "",
  steps: "",
  expectedResult: "",
  environment: "",
  owner: "",
  remarks: "",
};

export function TestCaseManagement({ entries, language }: Props) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "Test Case Management" : "测试用例管理",
    subtitle:
      language === "en"
        ? "Maintain smart lock test cases, priorities, and execution baselines."
        : "维护智能门锁测试用例、优先级与执行基线。",
    create: language === "en" ? "Create" : "创建",
    save: language === "en" ? "Save" : "保存",
    cancel: language === "en" ? "Cancel" : "取消",
    edit: language === "en" ? "Edit" : "编辑",
    remove: language === "en" ? "Delete" : "删除",
    confirmDelete: language === "en" ? "Delete this test case?" : "确定删除该测试用例？",
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const editing = useMemo(() => entries.find((e) => e.id === editingId) ?? null, [editingId, entries]);

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
      editingId ? `/api/quality-control/test-cases/${editingId}` : "/api/quality-control/test-cases",
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
    const res = await fetch(`/api/quality-control/test-cases/${id}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) return setMessage("Delete failed");
    if (editingId === id) reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="app-card p-5">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        <details className="mt-1 text-sm text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {language === "en" ? "About test cases" : "测试用例说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.subtitle}</p>
        </details>
        {editing ? (
          <p className="mt-2 text-xs text-app-muted">
            {language === "en" ? "Editing" : "编辑中"}: {editing.testCaseId}
          </p>
        ) : null}
        <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={submit}>
          <input
            className={ccInputSm}
            placeholder="Test case ID *"
            required
            value={form.testCaseId}
            onChange={(e) => setForm((f) => ({ ...f, testCaseId: e.target.value.toUpperCase() }))}
          />
          <input
            className={ccInputMd}
            placeholder="Title *"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
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
            placeholder="FW version"
            value={form.firmwareVersion}
            onChange={(e) => setForm((f) => ({ ...f, firmwareVersion: e.target.value }))}
          />
          <input
            className={ccInputMd}
            placeholder="Module"
            value={form.moduleName}
            onChange={(e) => setForm((f) => ({ ...f, moduleName: e.target.value }))}
          />
          <select
            className={ccSelectSm}
            value={form.category}
            title={language === "en" ? "Category" : "类别"}
            aria-label={language === "en" ? "Category" : "类别"}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as QcTestCaseCategory }))}
          >
            <option value="functional">functional</option>
            <option value="security">security</option>
            <option value="reliability">reliability</option>
            <option value="compatibility">compatibility</option>
            <option value="ota">ota</option>
            <option value="performance">performance</option>
          </select>
          <select
            className={ccSelectSm}
            value={form.priority}
            title={language === "en" ? "Priority" : "优先级"}
            aria-label={language === "en" ? "Priority" : "优先级"}
            onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as QcTestCasePriority }))}
          >
            <option value="P0">P0</option>
            <option value="P1">P1</option>
            <option value="P2">P2</option>
          </select>
          <select
            className={ccSelectSm}
            value={form.status}
            title={language === "en" ? "Status" : "状态"}
            aria-label={language === "en" ? "Status" : "状态"}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as QcTestCaseStatus }))}
          >
            <option value="draft">draft</option>
            <option value="reviewed">reviewed</option>
            <option value="released">released</option>
            <option value="obsolete">obsolete</option>
          </select>
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Preconditions"
            value={form.preconditions}
            onChange={(e) => setForm((f) => ({ ...f, preconditions: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Test steps"
            value={form.steps}
            onChange={(e) => setForm((f) => ({ ...f, steps: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Expected result"
            value={form.expectedResult}
            onChange={(e) => setForm((f) => ({ ...f, expectedResult: e.target.value }))}
          />
          <input
            className={ccInputMd}
            placeholder="Environment"
            value={form.environment}
            onChange={(e) => setForm((f) => ({ ...f, environment: e.target.value }))}
          />
          <input
            className={ccInputSm}
            placeholder="Owner"
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
          />
          <input
            className={`${ccInputMd} w-full min-w-0 max-w-2xl basis-full`}
            placeholder="Remarks"
            value={form.remarks}
            onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))}
          />
          <button className="shrink-0 app-button-primary px-4 py-2 text-sm" disabled={loading} type="submit">
            {editingId ? (
              <>
                <Save className="mr-2 inline h-4 w-4" />
                {t.save}
              </>
            ) : (
              <>
                <Plus className="mr-2 inline h-4 w-4" />
                {t.create}
              </>
            )}
          </button>
          {editingId ? (
            <button type="button" className="shrink-0 app-button-secondary px-4 py-2 text-sm" onClick={reset}>
              {t.cancel}
            </button>
          ) : null}
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>
      <section className="app-card p-5">
        <div className="app-table-shell overflow-x-auto">
          <table className="app-table min-w-[1200px]">
            <thead>
              <tr>
                <th className="px-2 py-2">ID</th>
                <th className="px-2 py-2">Title</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Priority</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Owner</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-2 py-2">{e.testCaseId}</td>
                  <td className="px-2 py-2">{e.title}</td>
                  <td className="px-2 py-2">{e.productSku}</td>
                  <td className="px-2 py-2">{e.category}</td>
                  <td className="px-2 py-2">{e.priority}</td>
                  <td className="px-2 py-2">{e.status}</td>
                  <td className="px-2 py-2">{e.owner || "-"}</td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button type="button" className="app-button-secondary px-2 py-1 text-xs" onClick={() => edit(e)}>
                        <Edit2 className="mr-1 inline h-3 w-3" />
                        {t.edit}
                      </button>
                      <button
                        type="button"
                        className="app-button-secondary px-2 py-1 text-xs text-red-600"
                        onClick={() => remove(e.id)}
                      >
                        <Trash2 className="mr-1 inline h-3 w-3" />
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
