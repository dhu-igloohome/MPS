"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildForecastDestinationOptions,
  forecastDestinationDisplay,
  withLegacyForecastDestination,
} from "@/lib/forecast-destination-countries";
import { Language } from "@/lib/i18n";
import { ForecastEntry, ProductItem, Region } from "@/lib/types";

type ForecastFormProps = {
  allowedRegions: Region[];
  products: ProductItem[];
  entries: ForecastEntry[];
  language: Language;
  canDelete: boolean;
};

type DraftForecastLine = {
  key: string;
  sku: string;
  productName: string;
  destination: string;
  buildToOrder: string;
  buildToStock: string;
  remark: string;
};

type ForecastEditDraft = {
  id: string;
  month: string;
  region: Region;
  destination: string;
  sku: string;
  productName: string;
  remark: string;
  buildToOrder: string;
  buildToStock: string;
  poNumber: string;
};

function newDraftForecastLine(products: ProductItem[]): DraftForecastLine {
  const first = products[0];
  return {
    key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `f-${Date.now()}-${Math.random()}`,
    sku: first?.sku || "",
    productName: first?.productName || "",
    destination: "",
    buildToOrder: "0",
    buildToStock: "0",
    remark: "",
  };
}

/** YYYY-MM options; labels are explicit EN/ZH so English UI is not tied to OS locale (unlike <input type="month">). */
function buildForecastMonthOptions(): { value: string; labelEn: string; labelZh: string }[] {
  const out: { value: string; labelEn: string; labelZh: string }[] = [];
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 24, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 36, 1);
  const cur = new Date(start);
  while (cur <= end) {
    const y = cur.getFullYear();
    const mo = cur.getMonth() + 1;
    const value = `${y}-${String(mo).padStart(2, "0")}`;
    const labelEn = new Date(y, mo - 1, 1).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    const labelZh = `${y}年${mo}月`;
    out.push({ value, labelEn, labelZh });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

function defaultForecastMonthValue(options: { value: string }[]): string {
  if (options.length === 0) return "";
  const d = new Date();
  const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  return options.some((o) => o.value === v) ? v : options[0].value;
}

function formatForecastMonthDisplay(ym: string, language: Language): string {
  const m = /^(\d{4})-(\d{2})$/.exec(ym.trim());
  if (!m) return ym;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  if (mo < 1 || mo > 12) return ym;
  if (language === "en") {
    return new Date(y, mo - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return `${y}年${mo}月`;
}

export function ForecastForm({
  allowedRegions,
  products,
  entries,
  language,
  canDelete,
}: ForecastFormProps) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "Forecast Input" : "Forecast 录入",
    subtitle:
      language === "en"
        ? "Fill monthly forecast for Product/SKU with BTO and BTS quantities. A unique forecast number is auto-assigned on save (region date + daily sequence)."
        : "按产品/SKU 填写月度 forecast（BTO 与 BTS）。保存时系统自动分配唯一 forecast number（按区域前缀 + 新加坡日期 + 当日流水）。",
    noProducts:
      language === "en"
        ? "No active products found. Please ask admin to add products in NPI Management > Product Database."
        : "未找到启用中的产品，请联系管理员在 NPI 管理 > 产品数据库 中维护。",
    forecastMonth: language === "en" ? "Forecast Month" : "Forecast 月份",
    region: language === "en" ? "Region" : "区域",
    destination: language === "en" ? "Destination country" : "目的国",
    destinationHint:
      language === "en"
        ? "Required. Choose the country or territory from the list (English name is stored)."
        : "必填，请从列表中选择国家/地区（系统保存英文标准名称）。",
    destinationPlaceholder:
      language === "en" ? "Select destination country…" : "请选择目的国…",
    productName: language === "en" ? "Product Name" : "产品名称",
    sku: "SKU",
    remark: language === "en" ? "Remark" : "备注",
    addSku: language === "en" ? "+" : "+",
    removeSku: language === "en" ? "Delete" : "删除",
    bto: language === "en" ? "Build to Order" : "按单生产",
    bts: language === "en" ? "Build to Stock" : "备货生产",
    saveFailed:
      language === "en"
        ? "Save failed. Please check fields and permissions."
        : "保存失败，请检查字段和权限。",
    saved: language === "en" ? "Saved successfully." : "保存成功。",
    saving: language === "en" ? "Saving..." : "保存中...",
    saveForecast: language === "en" ? "Save Forecast" : "保存 Forecast",
    useExistingPo: language === "en" ? "Use existing forecast number" : "复用已有 forecast number",
    existingPo: language === "en" ? "Existing forecast number" : "已有 forecast number",
    batchImport: language === "en" ? "Batch import (CSV)" : "CSV 批量导入",
    downloadTemplate: language === "en" ? "Download CSV template" : "下载 CSV 模板",
    batchHint:
      language === "en"
        ? "Header row required. Forecast number is still auto-generated server-side."
        : "需包含表头。forecast number 仍由服务端自动生成。",
    createdAt: language === "en" ? "Created At" : "创建日期",
    allForecasts: language === "en" ? "All Forecast Records" : "全部 Forecast 记录",
    noRecords: language === "en" ? "No forecast records yet." : "暂无 forecast 记录。",
    actions: language === "en" ? "Actions" : "操作",
    actionsRules:
      language === "en"
        ? "Use Delete for a single row, or tick several rows and click Delete selected. A cancellation reason is required (same rule for batch)."
        : "操作：可单行点「删除」；也可勾选多行后点「删除所选」批量删除。均需填写取消原因（与单条规则一致）。",
    delete: language === "en" ? "Delete" : "删除",
    deleteSelected: language === "en" ? "Delete selected" : "删除所选",
    deleteConfirm:
      language === "en"
        ? "Delete this forecast because customer cancelled it?"
        : "确认删除该 forecast（客户已取消）？",
    reasonPrompt:
      language === "en"
        ? "Please enter cancellation reason (required):"
        : "请输入取消原因（必填）：",
    batchDeleteConfirm: (n: number) =>
      language === "en"
        ? `Delete ${n} forecast record(s)?`
        : `确认删除已选的 ${n} 条 forecast？`,
    batchDeleted: (n: number) =>
      language === "en" ? `Deleted ${n} record(s).` : `已删除 ${n} 条。`,
    edit: language === "en" ? "Edit" : "编辑",
    cancelEdit: language === "en" ? "Cancel" : "取消",
    saveEdit: language === "en" ? "Save changes" : "保存修改",
    editPanelTitle: language === "en" ? "Edit forecast record" : "编辑 Forecast 记录",
    editHint:
      language === "en"
        ? "Forecast number is fixed. Other fields follow the same rules as when creating."
        : "Forecast 编号不可改；其余字段规则与新建时一致。",
    forecastNumberLabel: language === "en" ? "Forecast #" : "Forecast 编号",
    editSaveFailed: language === "en" ? "Save failed." : "保存失败。",
    editSaved: language === "en" ? "Saved." : "已保存。",
    comment: language === "en" ? "Comment" : "评论",
    commentSaved: language === "en" ? "Comment saved." : "评论已保存。",
    commentSaveFailed: language === "en" ? "Could not save comment." : "评论保存失败。",
  };
  const defaultRegion = allowedRegions[0];

  const forecastMonthPicker = useMemo(() => {
    const options = buildForecastMonthOptions();
    return { options, defaultValue: defaultForecastMonthValue(options) };
  }, []);

  const [month, setMonth] = useState(forecastMonthPicker.defaultValue);
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [lines, setLines] = useState<DraftForecastLine[]>([newDraftForecastLine(products)]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedForecastIds, setSelectedForecastIds] = useState<string[]>([]);
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [useExistingPo, setUseExistingPo] = useState(false);
  const [selectedPoNumber, setSelectedPoNumber] = useState("");
  const [message, setMessage] = useState("");
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [batchErrors, setBatchErrors] = useState<{ row: number; message: string }[]>([]);
  const batchFileRef = useRef<HTMLInputElement>(null);
  const forecastEditPanelRef = useRef<HTMLDivElement>(null);
  const [editDraft, setEditDraft] = useState<ForecastEditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  /** Inline comment drafts in the records table (keyed by forecast id); cleared after successful save. */
  const [inlineRemarkById, setInlineRemarkById] = useState<Record<string, string>>({});
  const [savingRemarkId, setSavingRemarkId] = useState<string | null>(null);
  const destinationOptions = useMemo(() => buildForecastDestinationOptions(), []);
  const editDestinationOptions = useMemo(() => {
    if (!editDraft) return destinationOptions;
    return withLegacyForecastDestination(editDraft.destination, destinationOptions);
  }, [editDraft, destinationOptions]);

  const skuOptions = useMemo(
    () => [...new Set(products.map((item) => item.sku).filter(Boolean))].sort(),
    [products],
  );
  const regionPoOptions = useMemo(
    () =>
      [...new Set(entries.filter((e) => e.region === region).map((e) => e.poNumber).filter(Boolean))].sort(),
    [entries, region],
  );

  const entryIdSet = useMemo(() => new Set(entries.map((e) => e.id)), [entries]);

  useEffect(() => {
    setSelectedForecastIds((prev) => prev.filter((id) => entryIdSet.has(id)));
  }, [entryIdSet]);

  const allForecastRowsSelected =
    entries.length > 0 && entries.every((e) => selectedForecastIds.includes(e.id));
  async function onBatchFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading(true);
    setMessage("");
    setBatchSummary(null);
    setBatchErrors([]);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/forecasts/batch", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      created?: number;
      failed?: number;
      errors?: { row: number; message: string }[];
    };
    setLoading(false);
    if (!response.ok) {
      setMessage(data.message || "Batch import failed");
      return;
    }
    const created = data.created ?? 0;
    const failed = data.failed ?? 0;
    setBatchSummary(
      language === "en"
        ? `Imported ${created} forecast row(s). ${failed} row(s) skipped or failed.`
        : `已导入 ${created} 条 forecast；${failed} 行跳过或失败。`,
    );
    setBatchErrors(Array.isArray(data.errors) ? data.errors.slice(0, 20) : []);
    router.refresh();
  }
  function onRegionChange(nextRegion: Region) {
    setRegion(nextRegion);
    if (useExistingPo) {
      const first = entries.find((e) => e.region === nextRegion && e.poNumber)?.poNumber || "";
      setSelectedPoNumber(first);
    }
  }

  function updateLineSku(lineKey: string, nextSku: string) {
    const matched = products.find((item) => item.sku === nextSku);
    setLines((prev) =>
      prev.map((line) =>
        line.key === lineKey
          ? {
              ...line,
              sku: nextSku,
              productName: matched?.productName || "",
            }
          : line,
      ),
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setBatchSummary(null);
    setBatchErrors([]);

    let issuedPo = useExistingPo ? selectedPoNumber : "";
    let created = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const response = await fetch("/api/forecasts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          region,
          destination: line.destination.trim(),
          poNumber: issuedPo,
          productName: line.productName,
          sku: line.sku,
          remark: line.remark,
          buildToOrder: Number(line.buildToOrder || 0),
          buildToStock: Number(line.buildToStock || 0),
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { entry?: { poNumber?: string } };
      if (!response.ok) {
        setLoading(false);
        setMessage(`${t.saveFailed} ${language === "en" ? "Failed row:" : "失败行："} ${i + 1}`);
        return;
      }
      created += 1;
      if (!issuedPo) {
        issuedPo = data.entry?.poNumber || "";
      }
    }

    setLoading(false);
    setMessage(
      `${t.saved} (${created}) ${issuedPo ? `${language === "en" ? "Forecast #:" : "Forecast #："} ${issuedPo}` : ""}`,
    );
    setLines([newDraftForecastLine(products)]);
    router.refresh();
  }
  async function onDelete(id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    const reason = window.prompt(t.reasonPrompt)?.trim() || "";
    if (!reason) {
      setMessage(language === "en" ? "Deletion reason is required." : "删除原因必填。");
      return;
    }
    setDeletingId(id);
    const response = await fetch(`/api/forecasts/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setDeletingId(null);
    if (!response.ok) {
      setMessage(language === "en" ? "Delete failed." : "删除失败。");
      return;
    }
    setMessage(language === "en" ? "Deleted." : "已删除。");
    setSelectedForecastIds((prev) => prev.filter((x) => x !== id));
    router.refresh();
  }

  function toggleForecastSelect(id: string) {
    setSelectedForecastIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function toggleSelectAllForecasts() {
    if (entries.length === 0) return;
    if (allForecastRowsSelected) {
      setSelectedForecastIds([]);
    } else {
      setSelectedForecastIds(entries.map((e) => e.id));
    }
  }

  function startEditForecast(item: ForecastEntry) {
    setMessage("");
    setEditDraft({
      id: item.id,
      month: item.month,
      region: item.region,
      destination: item.destination,
      sku: item.sku,
      productName: item.productName,
      remark: inlineRemarkById[item.id] ?? item.remark,
      buildToOrder: String(item.buildToOrder),
      buildToStock: String(item.buildToStock),
      poNumber: item.poNumber || "",
    });
    queueMicrotask(() => {
      forecastEditPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function updateEditSku(nextSku: string) {
    setEditDraft((prev) => {
      if (!prev) return prev;
      const matched = products.find((p) => p.sku === nextSku);
      return {
        ...prev,
        sku: nextSku,
        productName: matched?.productName ?? "",
      };
    });
  }

  async function saveEditForecast() {
    if (!editDraft) return;
    setSavingEdit(true);
    setMessage("");
    const response = await fetch(`/api/forecasts/${encodeURIComponent(editDraft.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: editDraft.month,
        region: editDraft.region,
        destination: editDraft.destination.trim(),
        productName: editDraft.productName,
        sku: editDraft.sku,
        remark: editDraft.remark,
        buildToOrder: Number(editDraft.buildToOrder || 0),
        buildToStock: Number(editDraft.buildToStock || 0),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setSavingEdit(false);
    if (!response.ok) {
      setMessage(data.message || t.editSaveFailed);
      return;
    }
    setEditDraft(null);
    setInlineRemarkById((prev) => {
      const next = { ...prev };
      delete next[editDraft.id];
      return next;
    });
    setMessage(t.editSaved);
    router.refresh();
  }

  async function onBatchDeleteForecasts() {
    if (selectedForecastIds.length === 0) return;
    if (!window.confirm(t.batchDeleteConfirm(selectedForecastIds.length))) return;
    const reason = window.prompt(t.reasonPrompt)?.trim() || "";
    if (!reason) {
      setMessage(language === "en" ? "Deletion reason is required." : "删除原因必填。");
      return;
    }
    setBatchDeleting(true);
    setMessage("");
    const response = await fetch("/api/forecasts/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedForecastIds, reason }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string; deleted?: number };
    setBatchDeleting(false);
    if (!response.ok) {
      setMessage(data.message || (language === "en" ? "Batch delete failed." : "批量删除失败。"));
      return;
    }
    const n = data.deleted ?? selectedForecastIds.length;
    setSelectedForecastIds([]);
    setMessage(t.batchDeleted(n));
    router.refresh();
  }

  async function saveInlineRemark(item: ForecastEntry) {
    const draft = (inlineRemarkById[item.id] ?? item.remark).trim();
    if (draft === item.remark.trim()) return;
    setSavingRemarkId(item.id);
    setMessage("");
    const response = await fetch(`/api/forecasts/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: item.month,
        region: item.region,
        destination: item.destination.trim(),
        productName: item.productName,
        sku: item.sku,
        remark: draft,
        buildToOrder: item.buildToOrder,
        buildToStock: item.buildToStock,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setSavingRemarkId(null);
    if (!response.ok) {
      setMessage(data.message || t.commentSaveFailed);
      return;
    }
    setInlineRemarkById((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setMessage(t.commentSaved);
    router.refresh();
  }

  return (
    <section className="app-card p-5">
      <h2 className="text-lg font-semibold text-foreground">{t.title}</h2>
      <p className="mt-1 text-sm text-app-muted">
        {t.subtitle}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href="/api/forecasts/csv-template"
          className="app-button-secondary inline-flex px-3 py-1.5 text-sm"
        >
          {t.downloadTemplate}
        </a>
        <input
          ref={batchFileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onBatchFileChange}
        />
        <button
          type="button"
          disabled={loading || products.length === 0}
          onClick={() => batchFileRef.current?.click()}
          className="app-button-secondary inline-flex px-3 py-1.5 text-sm disabled:opacity-50"
        >
          {t.batchImport}
        </button>
      </div>
      <p className="mt-2 text-xs text-app-muted">{t.batchHint}</p>
      {batchSummary ? <p className="mt-2 text-sm text-emerald-800">{batchSummary}</p> : null}
      {batchErrors.length > 0 ? (
        <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-sm text-red-700">
          {batchErrors.map((err) => (
            <li key={`${err.row}-${err.message}`}>
              {language === "en" ? "Row" : "第"}
              {err.row}
              {language === "en" ? ": " : " 行："}
              {err.message}
            </li>
          ))}
        </ul>
      ) : null}
      {products.length === 0 ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t.noProducts}
        </p>
      ) : null}

      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm text-foreground/85">{t.forecastMonth}</span>
          <select
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            required
            className="w-full px-3 py-2"
          >
            {forecastMonthPicker.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {language === "en" ? opt.labelEn : opt.labelZh}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-foreground/85">{t.region}</span>
          <select
            value={region}
            onChange={(event) => onRegionChange(event.target.value as Region)}
            className="w-full px-3 py-2"
          >
            {allowedRegions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm text-foreground/85">{t.useExistingPo}</span>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useExistingPo}
              disabled={regionPoOptions.length === 0}
              onChange={(event) => {
                const checked = event.target.checked;
                setUseExistingPo(checked);
                if (checked) {
                  setSelectedPoNumber(regionPoOptions[0] || "");
                }
              }}
            />
            <span className="text-sm text-app-muted">{t.useExistingPo}</span>
          </div>
        </label>
        {useExistingPo ? (
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm text-foreground/85">{t.existingPo}</span>
            <select
              value={selectedPoNumber}
              onChange={(event) => setSelectedPoNumber(event.target.value)}
              required
              className="w-full px-3 py-2"
            >
              {regionPoOptions.map((po) => (
                <option key={po} value={po}>
                  {po}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="md:col-span-2 space-y-3">
          {lines.map((line, idx) => (
            <div key={line.key} className="rounded-lg border border-app-border/80 p-3">
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm text-foreground/85">{t.sku}</span>
                  <div className="flex items-center gap-2">
                    <select
                      value={line.sku}
                      onChange={(event) => updateLineSku(line.key, event.target.value)}
                      required
                      className="w-full px-3 py-2"
                    >
                      {skuOptions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    {idx === lines.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setLines((prev) => [...prev, newDraftForecastLine(products)])}
                        className="rounded-lg px-3 py-2 text-sm"
                      >
                        {t.addSku}
                      </button>
                    ) : null}
                    {lines.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setLines((prev) => prev.filter((x) => x.key !== line.key))}
                        className="rounded-lg border border-red-300 px-3 py-2 text-sm text-red-700"
                      >
                        {t.removeSku}
                      </button>
                    ) : null}
                  </div>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-foreground/85">{t.productName}</span>
                  <input
                    value={line.productName}
                    readOnly
                    className="w-full rounded-lg border border-app-border bg-gray-50 px-3 py-2 outline-none"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm text-foreground/85">{t.destination}</span>
                  <select
                    value={line.destination}
                    onChange={(event) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.key === line.key ? { ...x, destination: event.target.value } : x,
                        ),
                      )
                    }
                    required
                    className="w-full px-3 py-2"
                  >
                    <option value="" disabled>
                      {t.destinationPlaceholder}
                    </option>
                    {destinationOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {language === "en" ? opt.labelEn : opt.labelZh}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs text-app-muted">{t.destinationHint}</span>
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-foreground/85">{t.bto}</span>
                  <input
                    type="number"
                    min={0}
                    value={line.buildToOrder}
                    onChange={(event) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.key === line.key ? { ...x, buildToOrder: event.target.value } : x,
                        ),
                      )
                    }
                    className="w-full px-3 py-2"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-sm text-foreground/85">{t.bts}</span>
                  <input
                    type="number"
                    min={0}
                    value={line.buildToStock}
                    onChange={(event) =>
                      setLines((prev) =>
                        prev.map((x) =>
                          x.key === line.key ? { ...x, buildToStock: event.target.value } : x,
                        ),
                      )
                    }
                    className="w-full px-3 py-2"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-sm text-foreground/85">{t.remark}</span>
                  <textarea
                    value={line.remark}
                    onChange={(event) =>
                      setLines((prev) =>
                        prev.map((x) => (x.key === line.key ? { ...x, remark: event.target.value } : x)),
                      )
                    }
                    rows={2}
                    className="w-full px-3 py-2"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || products.length === 0}
            className="app-button-primary px-4 py-2 text-sm font-medium disabled:opacity-60"
          >
            {loading ? t.saving : t.saveForecast}
          </button>
          {message ? <span className="text-sm text-app-muted">{message}</span> : null}
        </div>
      </form>

      {editDraft ? (
        <div
          ref={forecastEditPanelRef}
          className="mt-6 rounded-xl border-2 border-[var(--app-accent)] bg-app-accent-soft/40 p-4"
        >
          <h3 className="text-base font-semibold text-foreground">{t.editPanelTitle}</h3>
          <p className="mt-1 text-xs text-app-muted">{t.editHint}</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm text-foreground/85">{t.forecastNumberLabel}</span>
              <input
                value={editDraft.poNumber || "—"}
                readOnly
                className="w-full rounded-lg border border-app-border bg-gray-50 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">{t.forecastMonth}</span>
              <select
                value={editDraft.month}
                onChange={(e) => setEditDraft((d) => (d ? { ...d, month: e.target.value } : d))}
                className="w-full px-3 py-2 text-sm"
              >
                {forecastMonthPicker.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === "en" ? opt.labelEn : opt.labelZh}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">{t.region}</span>
              <select
                value={editDraft.region}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, region: e.target.value as Region } : d))
                }
                className="w-full px-3 py-2 text-sm"
              >
                {allowedRegions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm text-foreground/85">{t.destination}</span>
              <select
                value={editDraft.destination}
                onChange={(e) => setEditDraft((d) => (d ? { ...d, destination: e.target.value } : d))}
                required
                className="w-full px-3 py-2 text-sm"
              >
                {editDestinationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === "en" ? opt.labelEn : opt.labelZh}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-app-muted">{t.destinationHint}</span>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">{t.sku}</span>
              <select
                value={editDraft.sku}
                onChange={(e) => updateEditSku(e.target.value)}
                className="w-full px-3 py-2 text-sm"
              >
                {skuOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">{t.productName}</span>
              <input
                value={editDraft.productName}
                readOnly
                className="w-full rounded-lg border border-app-border bg-gray-50 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">{t.bto}</span>
              <input
                type="number"
                min={0}
                value={editDraft.buildToOrder}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, buildToOrder: e.target.value } : d))
                }
                className="w-full px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">{t.bts}</span>
              <input
                type="number"
                min={0}
                value={editDraft.buildToStock}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, buildToStock: e.target.value } : d))
                }
                className="w-full px-3 py-2 text-sm"
              />
            </label>
            <label className="block md:col-span-2">
              <span className="mb-1 block text-sm text-foreground/85">{t.remark}</span>
              <textarea
                value={editDraft.remark}
                onChange={(e) => setEditDraft((d) => (d ? { ...d, remark: e.target.value } : d))}
                rows={2}
                className="w-full px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingEdit}
              onClick={saveEditForecast}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
            >
              {savingEdit ? t.saving : t.saveEdit}
            </button>
            <button
              type="button"
              disabled={savingEdit}
              onClick={() => setEditDraft(null)}
              className="app-button-secondary px-4 py-2 text-sm"
            >
              {t.cancelEdit}
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">{t.allForecasts}</h3>
            {canDelete ? (
              <p className="mt-1 max-w-3xl text-xs text-app-muted">{t.actionsRules}</p>
            ) : (
              <p className="mt-1 max-w-3xl text-xs text-app-muted">
                {language === "en"
                  ? "Actions: Edit to update a saved row (same validation as create)."
                  : "操作：点「编辑」可修改已保存的记录（校验规则与新建一致）。"}
              </p>
            )}
          </div>
          {canDelete && entries.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 sm:pt-0.5">
              <span className="text-xs tabular-nums text-app-muted">
                {language === "en" ? `${selectedForecastIds.length} selected` : `已选 ${selectedForecastIds.length} 条`}
              </span>
              <button
                type="button"
                disabled={batchDeleting || selectedForecastIds.length === 0}
                onClick={onBatchDeleteForecasts}
                className="rounded-lg border border-red-300 bg-app-surface px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                {batchDeleting ? (language === "en" ? "Deleting…" : "删除中…") : t.deleteSelected}
              </button>
            </div>
          ) : null}
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left text-app-muted">
                {canDelete ? (
                  <th className="w-10 px-2 py-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-app-border"
                      checked={allForecastRowsSelected}
                      onChange={toggleSelectAllForecasts}
                      title={language === "en" ? "Select all rows" : "全选当前列表"}
                      aria-label={language === "en" ? "Select all rows" : "全选当前列表"}
                    />
                  </th>
                ) : null}
                <th className="px-2 py-2">{t.forecastMonth}</th>
                <th className="px-2 py-2">{language === "en" ? "Forecast #" : "Forecast #"}</th>
                <th className="px-2 py-2">{t.region}</th>
                <th className="px-2 py-2">{t.destination}</th>
                <th className="px-2 py-2">{t.productName}</th>
                <th className="px-2 py-2">{t.sku}</th>
                <th className="px-2 py-2">{t.bto}</th>
                <th className="px-2 py-2">{t.bts}</th>
                <th className="px-2 py-2">{t.createdAt}</th>
                <th className="px-2 py-2">{t.actions}</th>
                <th className="min-w-[12rem] px-2 py-2">{t.comment}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td
                    colSpan={canDelete ? 12 : 11}
                    className="px-2 py-6 text-center text-app-muted"
                  >
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                entries.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      editDraft?.id === item.id
                        ? "border-b border-app-border/40 bg-app-accent-soft/55"
                        : "border-b border-app-border/40"
                    }
                  >
                    {canDelete ? (
                      <td className="px-2 py-2 align-middle">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-app-border"
                          checked={selectedForecastIds.includes(item.id)}
                          onChange={() => toggleForecastSelect(item.id)}
                          aria-label={language === "en" ? "Select row" : "选择该行"}
                        />
                      </td>
                    ) : null}
                    <td className="px-2 py-2">{formatForecastMonthDisplay(item.month, language)}</td>
                    <td className="px-2 py-2">{item.poNumber || "—"}</td>
                    <td className="px-2 py-2">{item.region}</td>
                    <td className="px-2 py-2">
                      {forecastDestinationDisplay(item.destination, language, destinationOptions)}
                    </td>
                    <td className="px-2 py-2">{item.productName}</td>
                    <td className="px-2 py-2">{item.sku}</td>
                    <td className="px-2 py-2 tabular-nums">{item.buildToOrder}</td>
                    <td className="px-2 py-2 tabular-nums">{item.buildToStock}</td>
                    <td className="px-2 py-2">{item.createdAt.slice(0, 10)}</td>
                    <td className="px-2 py-2 align-top">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => startEditForecast(item)}
                          disabled={savingEdit || deletingId === item.id}
                          className="rounded border border-app-border px-2 py-1 text-foreground/90 hover:bg-app-accent-soft disabled:opacity-50"
                        >
                          {t.edit}
                        </button>
                        {canDelete ? (
                          <button
                            type="button"
                            onClick={() => onDelete(item.id)}
                            disabled={deletingId === item.id || savingEdit}
                            className="rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            {t.delete}
                          </button>
                        ) : null}
                      </div>
                    </td>
                    <td className="max-w-[20rem] px-2 py-2 align-top">
                      <textarea
                        rows={3}
                        maxLength={4000}
                        value={inlineRemarkById[item.id] ?? item.remark}
                        onChange={(e) =>
                          setInlineRemarkById((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
                        onBlur={() => void saveInlineRemark(item)}
                        disabled={savingRemarkId === item.id || savingEdit || deletingId === item.id}
                        placeholder={language === "en" ? "Add a comment…" : "输入评论…"}
                        className="w-full min-w-[10rem] rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm text-foreground outline-none ring-app-accent placeholder:text-app-muted focus:ring-2 disabled:opacity-60"
                        aria-label={language === "en" ? "Comment" : "评论"}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
