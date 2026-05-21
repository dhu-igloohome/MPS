"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, CloudDownload, Download, Plus, Trash2, Upload } from "lucide-react";

import {
  buildForecastDestinationOptions,
  forecastDestinationDisplay,
  withLegacyForecastDestination,
} from "@/lib/forecast-destination-countries";
import {
  FORECAST_INCOTERMS,
  forecastIncotermHint,
  type ForecastIncoterm,
} from "@/lib/forecast-incoterm";
import { TableCellLongText } from "@/components/shared/table-cell-long-text";
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
  incoterm: ForecastIncoterm;
  buildToOrder: string;
  buildToStock: string;
  remark: string;
};

type ForecastEditDraft = {
  id: string;
  month: string;
  region: Region;
  destination: string;
  incoterm: ForecastIncoterm;
  sku: string;
  productName: string;
  remark: string;
  opsAction: string;
  buildToOrder: string;
  buildToStock: string;
  poNumber: string;
};

const FORECAST_OPS_ACTION_OPTIONS = [
  "",
  "Ok to issue PO",
  "Not build new lot because of MOQ",
  "Consider stock transfer from other region",
] as const;

/** Stored value stays `USA`; dropdown / table show North America (EN) or 北美 (ZH). */
function forecastRegionSelectLabel(region: Region, language: Language): string {
  if (region === "USA") {
    return language === "en" ? "North America" : "北美";
  }
  return region;
}

function newDraftForecastLine(products: ProductItem[]): DraftForecastLine {
  const first = products[0];
  return {
    key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `f-${Date.now()}-${Math.random()}`,
    sku: first?.sku || "",
    productName: first?.productName || "",
    destination: "",
    incoterm: "EXW",
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
    batchImport: language === "en" ? "CSV import" : "CSV 导入",
    apiImport: language === "en" ? "API import" : "API 导入",
    bulkImport: language === "en" ? "Bulk import" : "批量导入",
    bulkImportHint:
      language === "en"
        ? "Template download, CSV upload, or one-click SKU Tracker sync."
        : "可下载模板、上传 CSV，或一键从 SKU Tracker 同步。",
    apiImportHint:
      language === "en"
        ? "One-click: loads SKU-level monthly sales for the selected Forecast Month from igloohome SKU Tracker (public /api/data). Uses current Region; default destination is Singapore (APAC), Germany (EU), or United States (North America). Quantities map to Build to Order; forecast numbers are auto-generated."
        : "一键从 igloohome SKU Tracker 拉取所选 Forecast 月份各 SKU 的月度销量（公开 /api/data）。使用当前区域；默认目的国为 APAC→新加坡、EU→德国、北美→美国。数量写入「按单生产」；forecast number 仍由系统生成。",
    downloadTemplate: language === "en" ? "CSV template" : "CSV 模板",
    importHelpTitle: language === "en" ? "Import notes" : "导入说明",
    importHelp:
      language === "en"
        ? "CSV: header required; forecast # auto-generated; incoterm optional (EXW default, or EXW/FOB/DAP/DDP).\nAPI: pulls SKU Tracker sales for selected month & region into BTO; forecast # auto-generated."
        : "CSV：需表头；forecast number 自动生成；incoterm 可选（默认 EXW，或 EXW/FOB/DAP/DDP）。\nAPI：按所选月份与区域从 SKU Tracker 写入 BTO；forecast number 自动生成。",
    skuLines: language === "en" ? "SKU lines" : "SKU 明细",
    addLine: language === "en" ? "Add line" : "加一行",
    addLineHint:
      language === "en"
        ? "Add another SKU row before saving this forecast."
        : "保存前可继续添加 SKU 行。",
    viewFullText: language === "en" ? "View full" : "查看全文",
    close: language === "en" ? "Close" : "关闭",
    lineNo: language === "en" ? "#" : "序",
    incoterm: language === "en" ? "Incoterm" : "贸易术语 (Incoterm)",
    batchHint:
      language === "en"
        ? "Header row required. Forecast number is still auto-generated server-side. Optional column incoterm defaults to EXW when omitted (must be EXW, FOB, DAP, or DDP when provided)."
        : "需包含表头。forecast number 仍由服务端自动生成。可选列 incoterm：省略时默认为 EXW；填写时须为 EXW、FOB、DAP、DDP。",
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
  const [inlineOpsActionById, setInlineOpsActionById] = useState<Record<string, string>>({});
  const [savingOpsActionId, setSavingOpsActionId] = useState<string | null>(null);
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

  async function onApiImportFromSkuTracker() {
    setLoading(true);
    setMessage("");
    setBatchSummary(null);
    setBatchErrors([]);
    const response = await fetch("/api/forecasts/import-from-igloohome-web", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, region }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      created?: number;
      failed?: number;
      errors?: { sku: string; message: string }[];
    };
    setLoading(false);
    if (!response.ok) {
      setMessage(data.message || (language === "en" ? "API import failed." : "API 导入失败。"));
      return;
    }
    const created = data.created ?? 0;
    const failed = data.failed ?? 0;
    if (data.message && created === 0 && failed === 0) {
      setMessage(data.message);
    } else {
      setMessage("");
    }
    setBatchSummary(
      language === "en"
        ? `API import: ${created} forecast row(s) created. ${failed} SKU(s) skipped or failed.`
        : `API 导入：已创建 ${created} 条 forecast；${failed} 个 SKU 跳过或失败。`,
    );
    const errs = Array.isArray(data.errors) ? data.errors : [];
    setBatchErrors(
      errs.slice(0, 20).map((err, i) => ({
        row: i + 1,
        message: `${err.sku}: ${err.message}`,
      })),
    );
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

  function addSkuLine() {
    setLines((prev) => [...prev, newDraftForecastLine(products)]);
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
          incoterm: line.incoterm,
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
      incoterm: item.incoterm,
      sku: item.sku,
      productName: item.productName,
      remark: inlineRemarkById[item.id] ?? item.remark,
      opsAction: inlineOpsActionById[item.id] ?? item.opsAction,
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
        incoterm: editDraft.incoterm,
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
        incoterm: item.incoterm,
        productName: item.productName,
        sku: item.sku,
        remark: draft,
        opsAction: item.opsAction,
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

  async function saveInlineOpsAction(item: ForecastEntry) {
    const draft = (inlineOpsActionById[item.id] ?? item.opsAction).trim();
    if (draft === (item.opsAction || "").trim()) return;
    setSavingOpsActionId(item.id);
    setMessage("");
    const response = await fetch(`/api/forecasts/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        month: item.month,
        region: item.region,
        destination: item.destination.trim(),
        incoterm: item.incoterm,
        productName: item.productName,
        sku: item.sku,
        remark: item.remark,
        opsAction: draft,
        buildToOrder: item.buildToOrder,
        buildToStock: item.buildToStock,
      }),
    });
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setSavingOpsActionId(null);
    if (!response.ok) {
      setMessage(data.message || (language === "en" ? "Could not save ops action." : "Ops action 保存失败。"));
      return;
    }
    setInlineOpsActionById((prev) => {
      const next = { ...prev };
      delete next[item.id];
      return next;
    });
    setMessage(language === "en" ? "Ops action saved." : "Ops action 已保存。");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="app-card overflow-hidden px-4 py-3 sm:px-5">
        <div className="rounded-xl border border-app-accent/30 bg-gradient-to-r from-app-accent-soft/50 to-white px-3 py-3 sm:px-4">
          <div className="mb-2.5 flex min-w-0 flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{t.bulkImport}</p>
              <p className="mt-0.5 text-[11px] text-app-muted">{t.bulkImportHint}</p>
            </div>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-app-border/80 bg-white/80 px-2 py-1 text-xs text-app-muted transition hover:border-app-border hover:bg-white hover:text-foreground"
              title={`${t.importHelpTitle}\n\n${t.importHelp}`}
              aria-label={t.importHelpTitle}
            >
              <CircleHelp size={15} strokeWidth={1.5} />
              <span className="hidden sm:inline">{t.importHelpTitle}</span>
            </button>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <a
              href="/api/forecasts/csv-template"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-app-border bg-white px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition duration-150 ease-out hover:border-app-accent/50 hover:bg-app-accent-soft/40 hover:shadow-md active:translate-y-0"
            >
              <Download size={16} strokeWidth={2} />
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
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border-2 border-app-accent bg-white px-3.5 py-2 text-sm font-semibold text-app-accent shadow-sm transition duration-150 ease-out hover:bg-app-accent-soft hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload size={16} strokeWidth={2} />
              {t.batchImport}
            </button>
            <button
              type="button"
              disabled={loading || products.length === 0}
              onClick={onApiImportFromSkuTracker}
              title={t.apiImportHint}
              className="app-button-primary inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-sm font-semibold shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:shadow-md active:translate-y-0 disabled:opacity-50"
            >
              <CloudDownload size={16} strokeWidth={2} />
              {t.apiImport}
            </button>
          </div>
        </div>
        {batchSummary || batchErrors.length > 0 || products.length === 0 ? (
          <div className="mt-2 min-w-0 border-t border-app-border/60 pt-2">
          {batchSummary ? <p className="text-sm text-emerald-800">{batchSummary}</p> : null}
          {batchErrors.length > 0 ? (
            <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-sm text-red-800">
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
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              {t.noProducts}
            </p>
          ) : null}
          </div>
        ) : null}
      </section>

      <section className="app-card overflow-hidden">
        <form className="grid grid-cols-1 gap-4 px-4 py-4 sm:px-5 md:grid-cols-12" onSubmit={onSubmit}>
          <div className="flex min-w-0 flex-wrap items-end gap-3 md:col-span-12">
            <p className="shrink-0 pb-2 text-sm font-semibold text-foreground">
              {language === "en" ? "New" : "新建"}
            </p>
            <label className="block shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.forecastMonth}</span>
              <select
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                required
                className="app-control-sm px-3 py-2 text-sm"
              >
                {forecastMonthPicker.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === "en" ? opt.labelEn : opt.labelZh}
                  </option>
                ))}
              </select>
            </label>

            <label className="block shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.region}</span>
              <select
                value={region}
                onChange={(event) => onRegionChange(event.target.value as Region)}
                className="app-control-sm px-3 py-2 text-sm"
              >
                {allowedRegions.map((item) => (
                  <option key={item} value={item}>
                    {forecastRegionSelectLabel(item, language)}
                  </option>
                ))}
              </select>
            </label>

            <label
              className="flex min-h-[38px] shrink-0 items-center gap-2 rounded-xl border border-app-border bg-white px-3 py-2 text-sm"
              title={t.useExistingPo}
            >
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
              <span className="whitespace-nowrap text-xs text-app-muted">
                {language === "en" ? "Reuse #" : "复用编号"}
              </span>
            </label>

            {useExistingPo ? (
              <label className="block shrink-0">
                <span className="mb-1 block text-xs text-foreground/85">{t.existingPo}</span>
                <select
                  value={selectedPoNumber}
                  onChange={(event) => setSelectedPoNumber(event.target.value)}
                  required
                  className="app-control-md px-3 py-2 text-sm"
                >
                  {regionPoOptions.map((po) => (
                    <option key={po} value={po}>
                      {po}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>

          <div className="min-w-0 md:col-span-12">
            <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-app-accent/25 bg-app-accent-soft/35 px-3 py-2">
              <div className="min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wide text-foreground/80">{t.skuLines}</span>
                <p className="mt-0.5 text-[11px] text-app-muted">{t.addLineHint}</p>
              </div>
              <button
                type="button"
                onClick={addSkuLine}
                disabled={products.length === 0}
                className="app-button-primary inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 text-sm font-semibold shadow-sm transition duration-150 ease-out hover:-translate-y-px hover:shadow-md active:translate-y-0 disabled:opacity-50"
              >
                <Plus size={16} strokeWidth={2} />
                {t.addLine}
              </button>
            </div>
            <div className="app-table-shell overflow-hidden rounded-xl border border-app-border/90">
              <div className="overflow-x-auto">
                <table className="app-table w-full min-w-[52rem] table-fixed text-sm">
                  <colgroup>
                    <col className="w-8" />
                    <col className="w-[5.5rem]" />
                    <col className="w-[11rem]" />
                    <col className="w-[10.5rem]" />
                    <col className="w-[4.75rem]" />
                    <col className="w-[4.5rem]" />
                    <col className="w-[4.5rem]" />
                    <col className="w-[14rem]" />
                    <col className="w-9" />
                  </colgroup>
                  <thead>
                    <tr className="[&>th]:bg-slate-50/90 [&>th]:px-2 [&>th]:py-2 [&>th]:text-left [&>th]:text-[11px] [&>th]:font-semibold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-app-muted">
                      <th>{t.lineNo}</th>
                      <th>{t.sku}</th>
                      <th>{t.productName}</th>
                      <th>{t.destination}</th>
                      <th>{t.incoterm}</th>
                      <th className="text-right">{t.bto}</th>
                      <th className="text-right">{t.bts}</th>
                      <th>{t.remark}</th>
                      <th aria-hidden />
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => (
                      <tr key={line.key} className="align-top [&>td]:px-2 [&>td]:py-1.5">
                        <td className="tabular-nums text-app-muted">{idx + 1}</td>
                        <td>
                          <select
                            value={line.sku}
                            onChange={(event) => updateLineSku(line.key, event.target.value)}
                            required
                            className="app-control-sm max-w-full px-2 py-1.5 text-sm"
                            aria-label={t.sku}
                          >
                            {skuOptions.map((item) => (
                              <option key={item} value={item}>
                                {item}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="max-w-[11rem]">
                          <TableCellLongText
                            text={line.productName}
                            maxWidthClass="max-w-[10.5rem]"
                            viewLabel={t.viewFullText}
                            dialogTitle={t.productName}
                            closeLabel={t.close}
                            expandThreshold={20}
                          />
                        </td>
                        <td>
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
                            title={t.destinationHint}
                            className="app-control-md max-w-full px-2 py-1.5 text-sm"
                            aria-label={t.destination}
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
                        </td>
                        <td>
                          <select
                            value={line.incoterm}
                            onChange={(event) =>
                              setLines((prev) =>
                                prev.map((x) =>
                                  x.key === line.key
                                    ? { ...x, incoterm: event.target.value as ForecastIncoterm }
                                    : x,
                                ),
                              )
                            }
                            required
                            title={forecastIncotermHint(line.incoterm, language)}
                            className="app-control-xs px-2 py-1.5 text-sm font-medium"
                            aria-label={t.incoterm}
                          >
                            {FORECAST_INCOTERMS.map((code) => (
                              <option key={code} value={code}>
                                {code}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
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
                            className="app-control-num px-2 py-1.5 text-sm"
                            aria-label={t.bto}
                          />
                        </td>
                        <td>
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
                            className="app-control-num px-2 py-1.5 text-sm"
                            aria-label={t.bts}
                          />
                        </td>
                        <td className="min-w-[14rem]">
                          <textarea
                            rows={2}
                            value={line.remark}
                            onChange={(event) =>
                              setLines((prev) =>
                                prev.map((x) => (x.key === line.key ? { ...x, remark: event.target.value } : x)),
                              )
                            }
                            placeholder={language === "en" ? "Optional" : "可选"}
                            className="w-full min-w-0 resize-y rounded-lg border border-app-border bg-white px-2 py-1.5 text-sm leading-snug"
                            aria-label={t.remark}
                          />
                        </td>
                        <td className="text-center">
                          {lines.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => setLines((prev) => prev.filter((x) => x.key !== line.key))}
                              className="inline-flex rounded-lg p-1.5 text-red-600 transition hover:bg-red-50"
                              title={t.removeSku}
                              aria-label={t.removeSku}
                            >
                              <Trash2 size={15} strokeWidth={1.5} />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={9} className="p-0">
                        <button
                          type="button"
                          onClick={addSkuLine}
                          disabled={products.length === 0}
                          className="flex w-full items-center justify-center gap-2 border-t-2 border-dashed border-app-accent/40 bg-app-accent-soft/25 px-3 py-3 text-sm font-semibold text-app-accent transition duration-150 ease-out hover:bg-app-accent-soft/50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus size={16} strokeWidth={2} />
                          {t.addLine}
                        </button>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-3 border-t border-app-border/60 pt-3 md:col-span-12">
            <button
              type="submit"
              disabled={loading || products.length === 0}
              className="app-button-primary inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 disabled:opacity-60"
            >
              {loading ? t.saving : t.saveForecast}
            </button>
            {message ? <span className="text-sm text-app-muted">{message}</span> : null}
          </div>
        </form>
      </section>

      {editDraft ? (
        <div
          ref={forecastEditPanelRef}
          className="mt-6 rounded-xl border-2 border-[var(--app-accent)] bg-app-accent-soft/40 p-4"
        >
          <h3 className="text-base font-semibold text-foreground">{t.editPanelTitle}</h3>
          <p className="mt-1 text-xs text-app-muted">{t.editHint}</p>
          <div className="mt-4 flex min-w-0 flex-wrap items-end gap-3">
            <label className="block shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.forecastNumberLabel}</span>
              <input
                value={editDraft.poNumber || "—"}
                readOnly
                className="app-control-md rounded-lg border border-app-border bg-gray-50 px-3 py-2 text-sm"
              />
            </label>
            <label className="block shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.forecastMonth}</span>
              <select
                value={editDraft.month}
                onChange={(e) => setEditDraft((d) => (d ? { ...d, month: e.target.value } : d))}
                className="app-control-sm px-3 py-2 text-sm"
              >
                {forecastMonthPicker.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === "en" ? opt.labelEn : opt.labelZh}
                  </option>
                ))}
              </select>
            </label>
            <label className="block shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.region}</span>
              <select
                value={editDraft.region}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, region: e.target.value as Region } : d))
                }
                className="app-control-sm px-3 py-2 text-sm"
              >
                {allowedRegions.map((item) => (
                  <option key={item} value={item}>
                    {forecastRegionSelectLabel(item, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.destination}</span>
              <select
                value={editDraft.destination}
                onChange={(e) => setEditDraft((d) => (d ? { ...d, destination: e.target.value } : d))}
                required
                title={t.destinationHint}
                className="app-control-md px-3 py-2 text-sm"
              >
                {editDestinationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === "en" ? opt.labelEn : opt.labelZh}
                  </option>
                ))}
              </select>
            </label>
            <label className="block shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.incoterm}</span>
              <select
                value={editDraft.incoterm}
                onChange={(e) =>
                  setEditDraft((d) =>
                    d ? { ...d, incoterm: e.target.value as ForecastIncoterm } : d,
                  )
                }
                required
                title={forecastIncotermHint(editDraft.incoterm, language)}
                className="app-control-xs px-3 py-2 text-sm font-medium"
              >
                {FORECAST_INCOTERMS.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <label className="block shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.sku}</span>
              <select
                value={editDraft.sku}
                onChange={(e) => updateEditSku(e.target.value)}
                className="app-control-sm px-3 py-2 text-sm"
              >
                {skuOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block max-w-[14rem] shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.productName}</span>
              <input
                value={editDraft.productName}
                readOnly
                title={editDraft.productName}
                className="w-full truncate rounded-lg border border-app-border bg-gray-50 px-3 py-2 text-sm"
              />
            </label>
            <label className="block shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.bto}</span>
              <input
                type="number"
                min={0}
                value={editDraft.buildToOrder}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, buildToOrder: e.target.value } : d))
                }
                className="app-control-num px-3 py-2 text-sm"
              />
            </label>
            <label className="block shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.bts}</span>
              <input
                type="number"
                min={0}
                value={editDraft.buildToStock}
                onChange={(e) =>
                  setEditDraft((d) => (d ? { ...d, buildToStock: e.target.value } : d))
                }
                className="app-control-num px-3 py-2 text-sm"
              />
            </label>
            <label className="block max-w-[12rem] shrink-0">
              <span className="mb-1 block text-xs text-foreground/85">{t.remark}</span>
              <input
                type="text"
                value={editDraft.remark}
                onChange={(e) => setEditDraft((d) => (d ? { ...d, remark: e.target.value } : d))}
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

      <section className="app-card overflow-hidden">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-app-border/80 px-4 py-3 sm:px-5">
          <h3
            className="text-sm font-semibold text-foreground"
            title={
              canDelete
                ? t.actionsRules
                : language === "en"
                  ? "Edit updates a saved row."
                  : "点「编辑」可修改已保存记录。"
            }
          >
            {t.allForecasts}
          </h3>
          {canDelete && entries.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs tabular-nums text-app-muted">
                {language === "en" ? `${selectedForecastIds.length} selected` : `已选 ${selectedForecastIds.length} 条`}
              </span>
              <button
                type="button"
                disabled={batchDeleting || selectedForecastIds.length === 0}
                onClick={onBatchDeleteForecasts}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-sm text-red-700 transition duration-150 ease-out hover:-translate-y-px hover:bg-red-50 active:translate-y-0 disabled:opacity-50"
              >
                <Trash2 size={15} strokeWidth={1.5} />
                {batchDeleting ? (language === "en" ? "Deleting…" : "删除中…") : t.deleteSelected}
              </button>
            </div>
          ) : null}
        </div>

        <div className="px-4 py-4 sm:px-5">
          <div className="app-table-shell overflow-hidden">
            <div className="max-h-[65vh] overflow-auto">
              <table className="app-table w-full min-w-[72rem] table-fixed text-sm">
                <colgroup>
                  {canDelete ? <col className="w-10" /> : null}
                  <col className="w-[6.5rem]" />
                  <col className="w-[9.5rem]" />
                  <col className="w-[5.5rem]" />
                  <col className="w-[8.5rem]" />
                  <col className="w-[4.25rem]" />
                  <col className="w-[11rem]" />
                  <col className="w-[5.5rem]" />
                  <col className="w-[4.25rem]" />
                  <col className="w-[4.25rem]" />
                  <col className="w-[6.5rem]" />
                  <col className="w-[8.5rem]" />
                  <col className="w-[12rem]" />
                  <col className="w-[14rem]" />
                </colgroup>
                <thead>
                  <tr className="[&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:bg-slate-50">
                    {canDelete ? (
                      <th className="w-10">
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
                    <th className="whitespace-nowrap">{t.forecastMonth}</th>
                    <th className="whitespace-nowrap">{language === "en" ? "Forecast #" : "Forecast #"}</th>
                    <th className="whitespace-nowrap">{t.region}</th>
                    <th>{t.destination}</th>
                    <th className="whitespace-nowrap">{t.incoterm}</th>
                    <th>{t.productName}</th>
                    <th className="whitespace-nowrap">{t.sku}</th>
                    <th className="whitespace-nowrap text-right">{t.bto}</th>
                    <th className="whitespace-nowrap text-right">{t.bts}</th>
                    <th className="whitespace-nowrap">{t.createdAt}</th>
                    <th>{t.actions}</th>
                    <th>{t.comment}</th>
                    <th>Ops action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={canDelete ? 14 : 13} className="py-10 text-center text-app-muted">
                        {t.noRecords}
                      </td>
                    </tr>
                  ) : (
                    entries.map((item, rowIdx) => {
                      const selected = selectedForecastIds.includes(item.id);
                      const editing = editDraft?.id === item.id;
                      const base =
                        rowIdx % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/40";
                      const rowClass = editing
                        ? "bg-app-accent-soft/55"
                        : base;
                      return (
                        <tr
                          key={item.id}
                          className={`${rowClass} ${selected ? "ring-1 ring-[rgba(238,100,84,0.25)]" : ""}`}
                        >
                          {canDelete ? (
                            <td>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-app-border"
                                checked={selected}
                                onChange={() => toggleForecastSelect(item.id)}
                                aria-label={language === "en" ? "Select row" : "选择该行"}
                              />
                            </td>
                          ) : null}
                          <td className="whitespace-nowrap">{formatForecastMonthDisplay(item.month, language)}</td>
                          <td className="truncate font-medium" title={item.poNumber || undefined}>
                            {item.poNumber || "—"}
                          </td>
                          <td className="whitespace-nowrap">{forecastRegionSelectLabel(item.region, language)}</td>
                          <td className="truncate" title={forecastDestinationDisplay(item.destination, language, destinationOptions)}>
                            {forecastDestinationDisplay(item.destination, language, destinationOptions)}
                          </td>
                          <td className="whitespace-nowrap font-medium">{item.incoterm}</td>
                          <td className="max-w-[11rem] align-top">
                            <TableCellLongText
                              text={item.productName}
                              maxWidthClass="max-w-[10.5rem]"
                              viewLabel={t.viewFullText}
                              dialogTitle={t.productName}
                              closeLabel={t.close}
                              expandThreshold={22}
                            />
                          </td>
                          <td className="whitespace-nowrap font-medium">{item.sku}</td>
                          <td className="text-right tabular-nums">{item.buildToOrder}</td>
                          <td className="text-right tabular-nums">{item.buildToStock}</td>
                          <td className="whitespace-nowrap tabular-nums text-app-muted">{item.createdAt.slice(0, 10)}</td>
                          <td className="align-top">
                            <div className="flex flex-wrap gap-1.5">
                              <button
                                type="button"
                                onClick={() => startEditForecast(item)}
                                disabled={savingEdit || deletingId === item.id}
                                className="app-button-secondary px-2.5 py-1 text-sm transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
                              >
                                {t.edit}
                              </button>
                              {canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => onDelete(item.id)}
                                  disabled={deletingId === item.id || savingEdit}
                                  className="rounded-xl border border-red-200 bg-white px-2.5 py-1 text-sm text-red-700 transition duration-150 ease-out hover:-translate-y-px hover:bg-red-50 active:translate-y-0 disabled:opacity-50"
                                >
                                  {t.delete}
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td className="align-top">
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
                              className="w-full min-w-0 resize-y rounded-xl border border-app-border bg-white px-2.5 py-2 text-sm text-foreground placeholder:text-app-muted focus-visible:ring-2 focus-visible:ring-[rgba(238,100,84,0.35)] disabled:opacity-60"
                              aria-label={language === "en" ? "Comment" : "评论"}
                            />
                          </td>
                          <td className="align-top">
                            <select
                              value={inlineOpsActionById[item.id] ?? item.opsAction}
                              onChange={(e) =>
                                setInlineOpsActionById((prev) => ({ ...prev, [item.id]: e.target.value }))
                              }
                              onBlur={() => void saveInlineOpsAction(item)}
                              disabled={
                                savingOpsActionId === item.id ||
                                savingEdit ||
                                deletingId === item.id
                              }
                              className="app-control-md max-w-[14rem] rounded-xl border border-app-border bg-white px-2.5 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-[rgba(238,100,84,0.35)] disabled:opacity-60"
                              aria-label="Ops action"
                            >
                              <option value="">{language === "en" ? "—" : "—"}</option>
                              {FORECAST_OPS_ACTION_OPTIONS.filter((x) => x !== "").map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
