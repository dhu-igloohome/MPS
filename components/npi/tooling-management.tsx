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
import type { ToolingEntry, ToolingStatus, ToolingType } from "@/lib/types";

type Props = { entries: ToolingEntry[]; language: Language };
type Form = {
  toolingCode: string;
  toolingName: string;
  toolingType: ToolingType;
  relatedSku: string;
  cmName: string;
  location: string;
  status: ToolingStatus;
  owner: string;
  manufacturer: string;
  startUseDate: string;
  cycleCount: string;
  cycleLimit: string;
  lastMaintenanceDate: string;
  nextMaintenanceDue: string;
  cost: string;
  currency: string;
  remarks: string;
};

const DEFAULT_FORM: Form = {
  toolingCode: "",
  toolingName: "",
  toolingType: "fixture",
  relatedSku: "",
  cmName: "",
  location: "",
  status: "design",
  owner: "",
  manufacturer: "",
  startUseDate: "",
  cycleCount: "",
  cycleLimit: "",
  lastMaintenanceDate: "",
  nextMaintenanceDue: "",
  cost: "",
  currency: "USD",
  remarks: "",
};

export function ToolingManagement({ entries, language }: Props) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "Tooling & Fixture Management" : "工装夹具管理",
    subtitle:
      language === "en"
        ? "Track molds, fixtures, gauges, and testers across NPI and mass production."
        : "跟踪 NPI 与量产阶段的模具、夹具、检具与测试工装。",
    create: language === "en" ? "Create tooling item" : "新增工装",
    save: language === "en" ? "Save" : "保存",
    cancel: language === "en" ? "Cancel" : "取消",
    edit: language === "en" ? "Edit" : "编辑",
    remove: language === "en" ? "Delete" : "删除",
    empty: language === "en" ? "No tooling items yet." : "暂无工装数据。",
    confirmDelete: language === "en" ? "Delete this tooling item?" : "确定删除该工装？",
  };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ToolingStatus>("all");
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
      return [e.toolingCode, e.toolingName, e.relatedSku, e.cmName, e.location].some((v) =>
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

  function startEdit(e: ToolingEntry) {
    setEditingId(e.id);
    setForm({
      toolingCode: e.toolingCode,
      toolingName: e.toolingName,
      toolingType: e.toolingType,
      relatedSku: e.relatedSku,
      cmName: e.cmName,
      location: e.location,
      status: e.status,
      owner: e.owner,
      manufacturer: e.manufacturer,
      startUseDate: e.startUseDate ?? "",
      cycleCount: String(e.cycleCount),
      cycleLimit: String(e.cycleLimit),
      lastMaintenanceDate: e.lastMaintenanceDate ?? "",
      nextMaintenanceDue: e.nextMaintenanceDue ?? "",
      cost: String(e.cost),
      currency: e.currency,
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
    const cycleCount = form.cycleCount === "" ? 0 : Number(form.cycleCount);
    const cycleLimit = form.cycleLimit === "" ? 0 : Number(form.cycleLimit);
    const cost = form.cost === "" ? 0 : Number(form.cost);
    if ([cycleCount, cycleLimit, cost].some((n) => Number.isNaN(n) || n < 0)) return setMessage("Invalid numeric fields");

    setLoading(true);
    setMessage("");
    const url = editingId ? `/api/npi/tooling/${encodeURIComponent(editingId)}` : "/api/npi/tooling";
    const method = editingId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cycleCount, cycleLimit, cost }),
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
    setMessage("");
    const res = await fetch(`/api/npi/tooling/${encodeURIComponent(id)}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) return setMessage(data.message || "Delete failed");
    if (editingId === id) reset();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="app-card p-5">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        <details className="mt-1 text-sm text-app-muted">
          <summary className="cursor-pointer select-none font-medium text-foreground/80">
            {language === "en" ? "About tooling" : "工装说明"}
          </summary>
          <p className="mt-1 max-w-3xl leading-relaxed">{t.subtitle}</p>
        </details>
        {editing ? (
          <p className="mt-2 text-xs text-app-muted">
            {language === "en" ? "Editing" : "编辑中"}: {editing.toolingCode}
          </p>
        ) : null}
        <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={onSubmit}>
          <input
            className={ccInputSm}
            value={form.toolingCode}
            onChange={(e) => setForm((f) => ({ ...f, toolingCode: e.target.value.toUpperCase() }))}
            placeholder="Tooling code *"
            required
          />
          <input
            className={ccInputMd}
            value={form.toolingName}
            onChange={(e) => setForm((f) => ({ ...f, toolingName: e.target.value }))}
            placeholder="Tooling name *"
            required
          />
          <select
            className={ccSelectSm}
            value={form.toolingType}
            title={language === "en" ? "Tooling type" : "工装类型"}
            aria-label={language === "en" ? "Tooling type" : "工装类型"}
            onChange={(e) => setForm((f) => ({ ...f, toolingType: e.target.value as ToolingType }))}
          >
            <option value="mold">mold</option>
            <option value="fixture">fixture</option>
            <option value="gauge">gauge</option>
            <option value="tester">tester</option>
          </select>
          <select
            className={ccSelectSm}
            value={form.status}
            title={language === "en" ? "Status" : "状态"}
            aria-label={language === "en" ? "Status" : "状态"}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ToolingStatus }))}
          >
            <option value="design">design</option>
            <option value="in_use">in_use</option>
            <option value="maintenance">maintenance</option>
            <option value="scrapped">scrapped</option>
          </select>
          <input
            className={ccInputSm}
            value={form.relatedSku}
            onChange={(e) => setForm((f) => ({ ...f, relatedSku: e.target.value.toUpperCase() }))}
            placeholder="Related SKU"
          />
          <input
            className={ccInputMd}
            value={form.cmName}
            onChange={(e) => setForm((f) => ({ ...f, cmName: e.target.value }))}
            placeholder="CM / Factory"
          />
          <input
            className={ccInputMd}
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            placeholder="Location"
          />
          <input
            className={ccInputSm}
            value={form.owner}
            onChange={(e) => setForm((f) => ({ ...f, owner: e.target.value }))}
            placeholder="Owner"
          />
          <input
            className={ccInputMd}
            value={form.manufacturer}
            onChange={(e) => setForm((f) => ({ ...f, manufacturer: e.target.value }))}
            placeholder="Manufacturer"
          />
          <input
            type="date"
            className={ccDate}
            value={form.startUseDate}
            onChange={(e) => setForm((f) => ({ ...f, startUseDate: e.target.value }))}
            title={language === "en" ? "Start use date" : "启用日期"}
          />
          <input
            type="number"
            min={0}
            step={1}
            className={ccNum}
            value={form.cycleCount}
            onChange={(e) => setForm((f) => ({ ...f, cycleCount: e.target.value }))}
            placeholder="Cycles"
            title="Cycle count (0 = not tracked)"
          />
          <input
            type="number"
            min={0}
            step={1}
            className={ccNum}
            value={form.cycleLimit}
            onChange={(e) => setForm((f) => ({ ...f, cycleLimit: e.target.value }))}
            placeholder="Limit"
            title="Cycle limit (0 = no limit)"
          />
          <input
            type="date"
            className={ccDate}
            value={form.lastMaintenanceDate}
            onChange={(e) => setForm((f) => ({ ...f, lastMaintenanceDate: e.target.value }))}
            title={language === "en" ? "Last maintenance" : "上次保养"}
          />
          <input
            type="date"
            className={ccDate}
            value={form.nextMaintenanceDue}
            onChange={(e) => setForm((f) => ({ ...f, nextMaintenanceDue: e.target.value }))}
            title={language === "en" ? "Next maintenance due" : "下次保养"}
          />
          <input
            type="number"
            min={0}
            step="0.01"
            className={ccNum}
            value={form.cost}
            onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
            placeholder="Cost"
            title="Cost (optional)"
          />
          <input
            className={ccInputSm}
            value={form.currency}
            onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
            placeholder="Currency"
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
            <button type="button" className="shrink-0 rounded-lg border border-app-border px-4 py-2 text-sm" onClick={reset}>
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
            placeholder={language === "en" ? "Search code / name / SKU / CM" : "搜索 编码/名称/SKU/CM"}
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
              setStatusFilter(e.target.value as "all" | ToolingStatus);
              setPage(1);
            }}
          >
            <option value="all">All status</option>
            <option value="design">design</option>
            <option value="in_use">in_use</option>
            <option value="maintenance">maintenance</option>
            <option value="scrapped">scrapped</option>
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
          <table className="w-full min-w-[1300px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border/80 text-left text-app-muted">
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Name</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">CM</th>
                <th className="px-2 py-2">Cycles</th>
                <th className="px-2 py-2">Cost</th>
                <th className="px-2 py-2">Next Maint.</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-2 py-6 text-center text-app-muted">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                pageEntries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-2 py-2">{e.toolingCode}</td>
                    <td className="px-2 py-2">{e.toolingName}</td>
                    <td className="px-2 py-2">{e.toolingType}</td>
                    <td className="px-2 py-2">{e.status}</td>
                    <td className="px-2 py-2">{e.relatedSku || "-"}</td>
                    <td className="px-2 py-2">{e.cmName || "-"}</td>
                    <td className="px-2 py-2">
                      {e.cycleCount === 0 && e.cycleLimit === 0 ? "-" : `${e.cycleCount}/${e.cycleLimit || "∞"}`}
                    </td>
                    <td className="px-2 py-2">{e.cost === 0 ? "-" : `${e.currency} ${e.cost.toFixed(2)}`}</td>
                    <td className="px-2 py-2">{e.nextMaintenanceDue || "-"}</td>
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
