"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Language } from "@/lib/i18n";
import type {
  OrderProgressEntry,
  OrderProgressOrderType,
  OrderProgressRegion,
  OrderProgressStatus,
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

function labels(language: Language) {
  const en = language === "en";
  return {
    formTitle: en ? "Create / edit order line" : "创建 / 编辑订单行",
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
    colProduct: en ? "Product" : "产品",
    colSku: "SKU",
    colQty: en ? "Qty" : "数量",
    colOrderDate: en ? "Order date" : "下单日",
    colExpectedDate: en ? "Expected delivery" : "预计交货日",
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
    setProductName("");
    setSku("");
    setQuantity("0");
    setOrderDate("");
    setExpectedDeliveryDate("");
    setOrderType("BTO");
    setProgress("not_started");
    setFactoryName("");
    if (allowedRegions[0]) setRegion(allowedRegions[0]);
    setMessage("");
  }

  function startEdit(entry: OrderProgressEntry) {
    setEditingId(entry.id);
    setProductName(entry.productName);
    setSku(entry.sku);
    setQuantity(String(entry.quantity));
    setOrderDate(entry.orderDate);
    setExpectedDeliveryDate(entry.expectedDeliveryDate);
    setOrderType(entry.orderType);
    setProgress(entry.progress);
    setFactoryName(entry.factoryName);
    setRegion(entry.region);
    setMessage("");
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      productName: resolvedProductName,
      sku: resolvedSku,
      quantity: Number(quantity),
      orderDate,
      expectedDeliveryDate,
      orderType,
      progress,
      factoryName,
      region: resolvedRegion,
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

  if (allowedRegions.length === 0) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {t.noRegions}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">{t.formTitle}</h3>
        {products.length === 0 ? (
          <p className="mt-2 text-sm text-amber-800">
            {language === "en"
              ? "No active products. Add products in Product Database first."
              : "没有启用中的产品，请先在产品数据库中维护。"}
          </p>
        ) : null}

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">{t.productName}</span>
            <select
              value={resolvedProductName}
              onChange={(e) => onProductNameChange(e.target.value)}
              required
              disabled={products.length === 0}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            >
              {productNameOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">{t.sku}</span>
            <select
              value={resolvedSku}
              onChange={(e) => setSku(e.target.value)}
              required
              disabled={products.length === 0}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            >
              {skuOptions.map((p) => (
                <option key={p.sku} value={p.sku}>
                  {p.sku}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">{t.quantity}</span>
            <input
              type="number"
              min={0}
              step={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">{t.orderDate}</span>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
            <span className="mt-1 block text-xs text-zinc-500">{t.dateHint}</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">{t.expectedDeliveryDate}</span>
            <input
              type="date"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
            <span className="mt-1 block text-xs text-zinc-500">{t.dateHint}</span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">{t.orderType}</span>
            <select
              value={orderType}
              onChange={(e) => setOrderType(e.target.value as OrderProgressOrderType)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            >
              {ORDER_TYPES.map((o) => (
                <option key={o} value={o}>
                  {orderTypeLabel(language, o)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">{t.progress}</span>
            <select
              value={progress}
              onChange={(e) => setProgress(e.target.value as OrderProgressStatus)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            >
              {PROGRESS.map((p) => (
                <option key={p} value={p}>
                  {progressLabel(language, p)}
                </option>
              ))}
            </select>
          </label>

          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm text-zinc-700">{t.factoryName}</span>
            <input
              value={factoryName}
              onChange={(e) => setFactoryName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">{t.region}</span>
            <select
              value={resolvedRegion}
              onChange={(e) => setRegion(e.target.value as OrderProgressRegion)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
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
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {loading ? "..." : editingId ? t.save : t.create}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                {t.cancelEdit}
              </button>
            ) : null}
          </div>
        </form>

        {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">{t.listTitle}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-2 py-2">{t.colProduct}</th>
                <th className="px-2 py-2">{t.colSku}</th>
                <th className="px-2 py-2">{t.colQty}</th>
                <th className="px-2 py-2">{t.colOrderDate}</th>
                <th className="px-2 py-2">{t.colExpectedDate}</th>
                <th className="px-2 py-2">{t.colType}</th>
                <th className="px-2 py-2">{t.colProgress}</th>
                <th className="px-2 py-2">{t.colFactory}</th>
                <th className="px-2 py-2">{t.colRegion}</th>
                <th className="px-2 py-2">{t.colBy}</th>
                <th className="px-2 py-2">{t.colActions}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-2 py-6 text-center text-zinc-500">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="px-2 py-2">{row.productName}</td>
                    <td className="px-2 py-2">{row.sku}</td>
                    <td className="px-2 py-2">{row.quantity}</td>
                    <td className="px-2 py-2">{row.orderDate}</td>
                    <td className="px-2 py-2">{row.expectedDeliveryDate}</td>
                    <td className="px-2 py-2">{orderTypeLabel(language, row.orderType)}</td>
                    <td className="px-2 py-2">{progressLabel(language, row.progress)}</td>
                    <td className="px-2 py-2">{row.factoryName || "—"}</td>
                    <td className="px-2 py-2">{row.region}</td>
                    <td className="px-2 py-2">{row.createdBy}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
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
