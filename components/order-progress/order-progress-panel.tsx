"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Language } from "@/lib/i18n";
import type {
  OrderProgressEntry,
  OrderProgressOrderType,
  OrderProgressRegion,
  OrderProgressStatus,
  OrderProductionStep,
  ProductItem,
} from "@/lib/types";

type OrderProgressPanelProps = {
  entries: OrderProgressEntry[];
  products: ProductItem[];
  allowedRegions: OrderProgressRegion[];
  language: Language;
};

const ORDER_TYPES: OrderProgressOrderType[] = ["BTO", "BTS"];
const PROGRESS: OrderProgressStatus[] = ["not_started", "in_production", "ready_to_ship"];

const PLAN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type DraftPlanRow = {
  key: string;
  expectedDeliveryDate: string;
  quantity: string;
  progress: OrderProgressStatus;
};

function newPlanRow(): DraftPlanRow {
  return {
    key: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}-${Math.random()}`,
    expectedDeliveryDate: "",
    quantity: "0",
    progress: "not_started",
  };
}

function labels(language: Language) {
  const en = language === "en";
  return {
    formTitle: en ? "Create / edit order line" : "创建 / 编辑订单行",
    orderNumber: en ? "Order number" : "订单号",
    productName: en ? "Product name" : "产品名称",
    sku: "SKU",
    quantity: en ? "Quantity" : "数量",
    orderDate: en ? "Order date" : "下单日期",
    expectedDeliveryDate: en ? "Expected delivery date" : "预计交货日期",
    dateHint: en
      ? "Calendar date (business: Singapore). Stored as YYYY-MM-DD."
      : "日历日期（业务按新加坡）。以 YYYY-MM-DD 存储。",
    orderType: en ? "Order type" : "订单类型",
    progress: en ? "Progress" : "进度",
    factoryName: en ? "Factory name" : "工厂名称",
    region: en ? "Region" : "地区",
    save: en ? "Save" : "保存",
    create: en ? "Create" : "创建",
    cancelEdit: en ? "Cancel edit" : "取消编辑",
    edit: en ? "Edit" : "编辑",
    delete: en ? "Delete" : "删除",
    listTitle: en ? "Order progress (your regions)" : "订单进度（您有权限的区域）",
    noRegions: en
      ? "Your account has no region assignment. You cannot manage order progress."
      : "您的账号未分配区域，无法管理订单进度。",
    empty: en ? "No records yet." : "暂无记录。",
    colOrderNumber: en ? "Order #" : "订单号",
    colProduct: en ? "Product" : "产品",
    colSku: "SKU",
    colQty: en ? "Qty" : "数量",
    colOrderDate: en ? "Order date" : "下单日",
    colExpectedDate: en ? "Expected delivery" : "预计交货日",
    deliveryBatches: en ? "Delivery batches (optional)" : "分批次交货（可选）",
    deliveryBatchesHint: en
      ? "Each batch has its own date, quantity, and progress. Leave empty to use only the main date above. Batch quantities do not need to sum to the line total (e.g. freebies or defective units)."
      : "每批可单独填写日期、数量与进度；不填批次则仅使用上方主预计交货日。各批数量之和不必等于订单行总数（例如赠品或不良品）。",
    addBatch: en ? "Add batch" : "添加批次",
    removeBatch: en ? "Remove" : "移除",
    batchDate: en ? "Batch date" : "批次交货日",
    batchQty: en ? "Batch qty" : "批次数量",
    batchProgress: en ? "Batch progress" : "批次进度",
    needDateOrBatch: en
      ? "Enter the main expected delivery date, or add at least one complete batch (date and non-negative integer quantity)."
      : "请填写主预计交货日，或至少添加一条完整批次（日期与非负整数数量）。",
    invalidBatchDate: en ? "Invalid batch delivery date." : "批次交货日期无效。",
    invalidBatchQty: en
      ? "Each batch with a date needs a non-negative integer quantity."
      : "填写了日期的批次须使用非负整数数量。",
    colType: en ? "Type" : "类型",
    colProgress: en ? "Progress" : "进度",
    colFactory: en ? "Factory" : "工厂",
    colRegion: en ? "Region" : "地区",
    colBy: en ? "By" : "创建人",
    colActions: en ? "Actions" : "操作",
    deleteConfirm: en ? "Delete this order line?" : "确认删除该订单行？",
    bto: en ? "BTO (Build to Order)" : "BTO（按单生产）",
    bts: en ? "BTS (Build to Stock)" : "BTS（备货生产）",
    pNotStarted: en ? "Not started" : "未生产",
    pInProd: en ? "In production" : "生产中",
    pReady: en ? "Ready to ship" : "待出货",
    exportCsv: en ? "Export CSV" : "导出 CSV",
    batchImport: en ? "Batch import (CSV)" : "CSV 批量导入",
    downloadTemplate: en ? "Download CSV template" : "下载 CSV 模板",
    batchHint: en
      ? "Up to 500 rows. Header row required. Does not create delivery batches—use the form for splits. Region must be within your access."
      : "最多 500 行，首行为表头。不会导入分批次交货，分批请在表单中维护。region 须为您有权限的区域。",
    colProduction: en ? "Production" : "生产进度",
    productionTitle: en ? "Production steps (this order line)" : "生产进度（本订单行）",
    productionEmpty: en
      ? "No template for this product + SKU. Super admin can define steps in Product Database."
      : "当前产品+SKU 无工序模板，超级管理员可在产品数据库中维护「生产工序」。",
    productionToggleFailed: en ? "Could not update step." : "更新工序状态失败。",
  };
}

function progressLabel(language: Language, p: OrderProgressStatus) {
  const t = labels(language);
  if (p === "not_started") return t.pNotStarted;
  if (p === "in_production") return t.pInProd;
  return t.pReady;
}

function orderTypeLabel(language: Language, o: OrderProgressOrderType) {
  const t = labels(language);
  return o === "BTO" ? t.bto : t.bts;
}

export function OrderProgressPanel({
  entries,
  products,
  allowedRegions,
  language,
}: OrderProgressPanelProps) {
  const router = useRouter();
  const t = labels(language);

  const productNameOptions = useMemo(
    () => [...new Set(products.map((p) => p.productName))],
    [products],
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState("");
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [orderDate, setOrderDate] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [orderType, setOrderType] = useState<OrderProgressOrderType>("BTO");
  const [progress, setProgress] = useState<OrderProgressStatus>("not_started");
  const [factoryName, setFactoryName] = useState("");
  const [region, setRegion] = useState<OrderProgressRegion>(() => allowedRegions[0] ?? "APAC");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [planRows, setPlanRows] = useState<DraftPlanRow[]>([]);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [batchErrors, setBatchErrors] = useState<{ row: number; message: string }[]>([]);
  const batchFileRef = useRef<HTMLInputElement>(null);
  /** Server steps keyed by order id; patched rows after checkbox toggles until refresh. */
  const [productionStepPatches, setProductionStepPatches] = useState<
    Record<string, Record<string, OrderProductionStep>>
  >({});
  const [togglingProductionKey, setTogglingProductionKey] = useState<string | null>(null);

  const productionStepsByOrderId = useMemo(() => {
    const next: Record<string, OrderProductionStep[]> = {};
    for (const e of entries) {
      const patch = productionStepPatches[e.id];
      next[e.id] = patch
        ? e.productionSteps.map((s) => patch[s.id] ?? s)
        : e.productionSteps;
    }
    return next;
  }, [entries, productionStepPatches]);

  const resolvedProductName =
    productName.length > 0 && productNameOptions.includes(productName)
      ? productName
      : (productNameOptions[0] ?? "");

  const skuOptions = useMemo(
    () => products.filter((p) => p.productName === resolvedProductName),
    [products, resolvedProductName],
  );

  const resolvedSku = skuOptions.some((p) => p.sku === sku)
    ? sku
    : (skuOptions[0]?.sku ?? "");

  const resolvedRegion = allowedRegions.includes(region)
    ? region
    : (allowedRegions[0] ?? "APAC");

  function onProductNameChange(nextName: string) {
    setProductName(nextName);
    const opts = products.filter((p) => p.productName === nextName);
    setSku(opts[0]?.sku ?? "");
  }

  function resetForm() {
    setEditingId(null);
    setOrderNumber("");
    setProductName("");
    setSku("");
    setQuantity("0");
    setOrderDate("");
    setExpectedDeliveryDate("");
    setOrderType("BTO");
    setProgress("not_started");
    setFactoryName("");
    if (allowedRegions[0]) setRegion(allowedRegions[0]);
    setPlanRows([]);
    setMessage("");
    setBatchSummary(null);
    setBatchErrors([]);
  }

  function startEdit(entry: OrderProgressEntry) {
    setEditingId(entry.id);
    setOrderNumber(entry.orderNumber);
    setProductName(entry.productName);
    setSku(entry.sku);
    setQuantity(String(entry.quantity));
    setOrderDate(entry.orderDate);
    setExpectedDeliveryDate(entry.expectedDeliveryDate);
    setOrderType(entry.orderType);
    setProgress(entry.progress);
    setFactoryName(entry.factoryName);
    setRegion(entry.region);
    setPlanRows(
      entry.deliveryPlans.length > 0
        ? entry.deliveryPlans.map((p) => ({
            key: p.id,
            expectedDeliveryDate: p.expectedDeliveryDate,
            quantity: String(p.quantity),
            progress: p.progress,
          }))
        : [],
    );
    setMessage("");
    setBatchSummary(null);
    setBatchErrors([]);
  }

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
    const response = await fetch("/api/order-progress/batch", {
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
        ? `Imported ${created} order line(s). ${failed} row(s) skipped or failed.`
        : `已导入 ${created} 条订单行；${failed} 行跳过或失败。`,
    );
    setBatchErrors(Array.isArray(data.errors) ? data.errors.slice(0, 20) : []);
    router.refresh();
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setBatchSummary(null);
    setBatchErrors([]);

    const deliveryPlans: {
      expectedDeliveryDate: string;
      quantity: number;
      progress: OrderProgressStatus;
    }[] = [];

    for (const r of planRows) {
      if (!r.expectedDeliveryDate.trim()) continue;
      if (!PLAN_DATE_RE.test(r.expectedDeliveryDate)) {
        setLoading(false);
        setMessage(t.invalidBatchDate);
        return;
      }
      const q = Number(r.quantity);
      if (!Number.isInteger(q) || q < 0) {
        setLoading(false);
        setMessage(t.invalidBatchQty);
        return;
      }
      deliveryPlans.push({
        expectedDeliveryDate: r.expectedDeliveryDate,
        quantity: q,
        progress: r.progress,
      });
    }

    if (deliveryPlans.length === 0 && !PLAN_DATE_RE.test(expectedDeliveryDate)) {
      setLoading(false);
      setMessage(t.needDateOrBatch);
      return;
    }

    const effectiveExpectedDate =
      deliveryPlans.length > 0
        ? deliveryPlans.reduce(
            (min, p) => (p.expectedDeliveryDate < min ? p.expectedDeliveryDate : min),
            deliveryPlans[0].expectedDeliveryDate,
          )
        : expectedDeliveryDate;

    const payload = {
      orderNumber: orderNumber.trim().slice(0, 200),
      productName: resolvedProductName,
      sku: resolvedSku,
      quantity: Number(quantity),
      orderDate,
      expectedDeliveryDate: effectiveExpectedDate,
      orderType,
      progress,
      factoryName,
      region: resolvedRegion,
      deliveryPlans,
    };

    const url =
      editingId === null
        ? "/api/order-progress"
        : `/api/order-progress/${encodeURIComponent(editingId)}`;
    const method = editingId === null ? "POST" : "PATCH";

    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(false);

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      setMessage(data.message || "Request failed");
      return;
    }

    resetForm();
    router.refresh();
  }

  function productionSummary(steps: OrderProductionStep[]): string {
    if (steps.length === 0) return "—";
    const done = steps.filter((s) => s.done).length;
    return `${done}/${steps.length}`;
  }

  async function onToggleProductionStep(orderId: string, stepId: string, done: boolean) {
    const key = `${orderId}:${stepId}`;
    setTogglingProductionKey(key);
    setMessage("");
    const response = await fetch(
      `/api/order-progress/${encodeURIComponent(orderId)}/production-steps`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stepId, done }),
      },
    );
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      step?: OrderProductionStep;
    };
    setTogglingProductionKey(null);
    if (!response.ok || !data.step) {
      setMessage(data.message || t.productionToggleFailed);
      return;
    }
    setProductionStepPatches((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] ?? {}),
        [data.step!.id]: data.step!,
      },
    }));
  }

  async function onDelete(id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    setLoading(true);
    const response = await fetch(`/api/order-progress/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setLoading(false);
    if (!response.ok) {
      setMessage("Delete failed");
      return;
    }
    if (editingId === id) resetForm();
    router.refresh();
  }

  function renderProductionChecklist(
    orderId: string,
    steps: OrderProductionStep[],
    variant: "form" | "table",
  ) {
    const compact = variant === "table";
    if (steps.length === 0) {
      if (compact) {
        return <span className="text-xs text-app-muted/80">—</span>;
      }
      return <p className="mt-2 text-sm text-app-muted">{t.productionEmpty}</p>;
    }
    return (
      <ul
        className={
          compact
            ? "max-h-52 space-y-1 overflow-y-auto pr-0.5"
            : "mt-3 max-h-64 space-y-2 overflow-y-auto"
        }
      >
        {steps.map((s) => {
          const toggleKey = `${orderId}:${s.id}`;
          const busy = togglingProductionKey === toggleKey;
          return (
            <li
              key={s.id}
              className={
                compact
                  ? "flex items-start gap-1.5 rounded border border-app-border/35 bg-app-accent-soft/55 px-2 py-1 text-xs"
                  : "flex items-start gap-2 rounded-lg border border-app-border/90 bg-app-surface px-3 py-2 text-sm"
              }
            >
              <input
                type="checkbox"
                className={compact ? "mt-0.5 h-3.5 w-3.5 shrink-0" : "mt-0.5 shrink-0"}
                checked={s.done}
                disabled={busy}
                onChange={(e) => onToggleProductionStep(orderId, s.id, e.target.checked)}
              />
              <span className="min-w-0 text-foreground/90">
                <span className="tabular-nums text-app-muted">{s.sortOrder + 1}. </span>
                {s.label}
                {!compact && s.done && s.completedBy ? (
                  <span className="mt-0.5 block text-xs text-app-muted">
                    {s.completedAt ?? ""}
                    {s.completedAt ? " · " : null}
                    {s.completedBy}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>
    );
  }

  if (allowedRegions.length === 0) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t.noRegions}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="text-lg font-semibold text-foreground">{t.formTitle}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/api/order-progress/csv-template"
              prefetch={false}
              className="inline-flex rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-foreground/85 hover:bg-app-accent-soft"
            >
              {t.downloadTemplate}
            </Link>
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
              className="inline-flex rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-foreground/85 hover:bg-app-accent-soft disabled:opacity-50"
            >
              {t.batchImport}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-app-muted">{t.batchHint}</p>
        {batchSummary ? (
          <p className="mt-2 text-sm text-emerald-800">{batchSummary}</p>
        ) : null}
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
          <p className="mt-2 text-sm text-amber-800">
            {language === "en"
              ? "No active products. Add products in Product Database first."
              : "没有启用中的产品，请先在产品数据库中维护。"}
          </p>
        ) : null}

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm text-foreground/85">{t.orderNumber}</span>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              maxLength={200}
              placeholder={language === "en" ? "Optional" : "选填"}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.productName}</span>
            <select
              value={resolvedProductName}
              onChange={(e) => onProductNameChange(e.target.value)}
              required
              disabled={products.length === 0}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            >
              {productNameOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.sku}</span>
            <select
              value={resolvedSku}
              onChange={(e) => setSku(e.target.value)}
              required
              disabled={products.length === 0}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            >
              {skuOptions.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.quantity}</span>
            <input
              type="number"
              min={0}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.orderDate}</span>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              required
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            />
            <span className="mt-1 block text-xs text-app-muted">{t.dateHint}</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.expectedDeliveryDate}</span>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              required={planRows.length === 0}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            />
            <span className="mt-1 block text-xs text-app-muted">{t.dateHint}</span>
          </label>

          <div className="md:col-span-2 rounded-xl border border-app-border/90 bg-app-accent-soft/50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium text-foreground/90">{t.deliveryBatches}</span>
              <button
                type="button"
                onClick={() => setPlanRows((rows) => [...rows, newPlanRow()])}
                className="rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-foreground/85 hover:bg-app-accent-soft"
              >
                {t.addBatch}
              </button>
            </div>
            <p className="mt-2 text-xs text-app-muted">{t.deliveryBatchesHint}</p>
            {planRows.length > 0 ? (
              <div className="mt-3 space-y-3">
                {planRows.map((row, index) => (
                  <div
                    key={row.key}
                    className="grid gap-2 rounded-lg border border-app-border/90 bg-app-surface p-3 sm:grid-cols-[1fr_7rem_1fr_auto] sm:items-end"
                  >
                    <label className="block min-w-0">
                      <span className="mb-1 block text-xs text-app-muted">{t.batchDate}</span>
                      <input
                        type="date"
                        value={row.expectedDeliveryDate}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPlanRows((rows) =>
                            rows.map((r, i) => (i === index ? { ...r, expectedDeliveryDate: v } : r)),
                          );
                        }}
                        className="w-full rounded-lg border border-app-border px-2 py-2 text-sm outline-none ring-app-accent focus:ring-2"
                      />
                    </label>
                    <label className="block min-w-0">
                      <span className="mb-1 block text-xs text-app-muted">{t.batchQty}</span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={row.quantity}
                        onChange={(e) => {
                          const v = e.target.value;
                          setPlanRows((rows) =>
                            rows.map((r, i) => (i === index ? { ...r, quantity: v } : r)),
                          );
                        }}
                        className="w-full rounded-lg border border-app-border px-2 py-2 text-sm outline-none ring-app-accent focus:ring-2"
                      />
                    </label>
                    <label className="block min-w-0">
                      <span className="mb-1 block text-xs text-app-muted">{t.batchProgress}</span>
                      <select
                        value={row.progress}
                        onChange={(e) => {
                          const v = e.target.value as OrderProgressStatus;
                          setPlanRows((rows) =>
                            rows.map((r, i) => (i === index ? { ...r, progress: v } : r)),
                          );
                        }}
                        className="w-full rounded-lg border border-app-border px-2 py-2 text-sm outline-none ring-app-accent focus:ring-2"
                      >
                        {PROGRESS.map((p) => (
                          <option key={p} value={p}>
                            {progressLabel(language, p)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setPlanRows((rows) => rows.filter((_, i) => i !== index))}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                      >
                        {t.removeBatch}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.orderType}</span>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderProgressOrderType)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            >
              {ORDER_TYPES.map((o) => (
                <option key={o} value={o}>
                  {orderTypeLabel(language, o)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.progress}</span>
            <select
              value={progress}
              onChange={(e) => setProgress(e.target.value as OrderProgressStatus)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            >
              {PROGRESS.map((p) => (
                <option key={p} value={p}>
                  {progressLabel(language, p)}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm text-foreground/85">{t.factoryName}</span>
            <input
              value={factoryName}
              onChange={(e) => setFactoryName(e.target.value)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.region}</span>
            <select
              value={resolvedRegion}
              onChange={(e) => setRegion(e.target.value as OrderProgressRegion)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            >
              {allowedRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap items-end gap-2 md:col-span-2">
            <button
              type="submit"
              disabled={loading || products.length === 0}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
            >
              {loading ? "..." : editingId ? t.save : t.create}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-app-border px-4 py-2 text-sm text-foreground/85 hover:bg-app-accent-soft"
              >
                {t.cancelEdit}
              </button>
            ) : null}
          </div>

          {editingId ? (
            <div className="md:col-span-2 rounded-xl border border-app-border/90 bg-app-accent-soft/50 p-4">
              <p className="text-sm font-medium text-foreground/90">{t.productionTitle}</p>
              {renderProductionChecklist(
                editingId,
                productionStepsByOrderId[editingId] ?? [],
                "form",
              )}
            </div>
          ) : null}
        </form>

        {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-lg font-semibold text-foreground">{t.listTitle}</h3>
          <Link
            href="/api/order-progress/export-csv"
            prefetch={false}
            className="inline-flex w-fit items-center rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-foreground/85 hover:bg-app-accent-soft"
          >
            {t.exportCsv}
          </Link>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[1280px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border/90 text-left text-app-muted">
                <th className="px-2 py-2">{t.colOrderNumber}</th>
                <th className="px-2 py-2">{t.colProduct}</th>
                <th className="px-2 py-2">{t.colSku}</th>
                <th className="px-2 py-2">{t.colQty}</th>
                <th className="px-2 py-2">{t.colOrderDate}</th>
                <th className="px-2 py-2">{t.colExpectedDate}</th>
                <th className="px-2 py-2">{t.colType}</th>
                <th className="px-2 py-2">{t.colProgress}</th>
                <th className="px-2 py-2">{t.colProduction}</th>
                <th className="px-2 py-2">{t.colFactory}</th>
                <th className="px-2 py-2">{t.colRegion}</th>
                <th className="px-2 py-2">{t.colBy}</th>
                <th className="px-2 py-2">{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-2 py-6 text-center text-app-muted">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr key={row.id} className="border-b border-app-border/35">
                    <td className="px-2 py-2 font-medium tabular-nums text-foreground">
                      {row.orderNumber || "—"}
                    </td>
                    <td className="px-2 py-2">{row.productName}</td>
                    <td className="px-2 py-2">{row.sku}</td>
                    <td className="px-2 py-2">{row.quantity}</td>
                    <td className="px-2 py-2">{row.orderDate}</td>
                    <td className="px-2 py-2 align-top">
                      {row.deliveryPlans.length > 0 ? (
                        <ul className="max-w-[14rem] space-y-1 text-xs text-foreground/90">
                          {row.deliveryPlans.map((p) => (
                            <li key={p.id}>
                              <span className="font-medium tabular-nums">{p.expectedDeliveryDate}</span>
                              <span className="text-app-muted"> · </span>
                              <span className="tabular-nums">{p.quantity}</span>
                              <span className="text-app-muted"> · </span>
                              {progressLabel(language, p.progress)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        row.expectedDeliveryDate
                      )}
                    </td>
                    <td className="px-2 py-2">{orderTypeLabel(language, row.orderType)}</td>
                    <td className="px-2 py-2">{progressLabel(language, row.progress)}</td>
                    <td className="min-w-[13rem] max-w-[18rem] px-2 py-2 align-top">
                      {(() => {
                        const steps = productionStepsByOrderId[row.id] ?? row.productionSteps;
                        return (
                          <div>
                            {steps.length > 0 ? (
                              <p className="mb-1 text-xs font-medium tabular-nums text-app-muted">
                                {productionSummary(steps)}
                              </p>
                            ) : null}
                            {renderProductionChecklist(row.id, steps, "table")}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-2 py-2">{row.factoryName || "—"}</td>
                    <td className="px-2 py-2">{row.region}</td>
                    <td className="px-2 py-2">{row.createdBy}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded border border-app-border px-2 py-1 hover:bg-app-accent-soft"
                        >
                          {t.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(row.id)}
                          className="rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50"
                        >
                          {t.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
