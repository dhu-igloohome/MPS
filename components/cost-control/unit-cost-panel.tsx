"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import type { ProductItem, SupplierEntry, UnitCostQuoteEntry } from "@/lib/types";

type Props = {
  language: Language;
  initialEntries: UnitCostQuoteEntry[];
  products: ProductItem[];
  suppliers: SupplierEntry[];
};

export function UnitCostPanel({ language, initialEntries, products, suppliers }: Props) {
  const router = useRouter();
  const en = language === "en";
  const t = {
    title: en ? "New quotation" : "新增报价",
    history: en ? "Quotation history" : "历史报价",
    sku: "SKU",
    unitPrice: en ? "Unit price (USD)" : "单价 (USD)",
    taxIncluded: en ? "Tax included" : "是否含税",
    supplier: en ? "Supplier name" : "供应商名称",
    quoteDate: en ? "Quote date" : "报价日期",
    save: en ? "Save quotation" : "保存报价",
    saving: en ? "Saving…" : "保存中…",
    empty: en ? "No quotations yet." : "暂无报价记录。",
    filterSku: en ? "Filter by SKU" : "按 SKU 筛选",
    allSkus: en ? "All SKUs" : "全部 SKU",
    yes: en ? "Yes" : "是",
    no: en ? "No" : "否",
    by: en ? "By" : "录入人",
    at: en ? "Recorded at" : "录入时间",
    hint: en
      ? "Supplier names match Supply Chain → Suppliers (active). Add a row for each new quote; history lists all records."
      : "供应商名称与「供应链 → 供应商」中启用供应商一致。每次新报价保存一条；下方为全部历史记录，可按 SKU 筛选。",
  };

  const skuOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of products) {
      if (p.sku?.trim()) set.add(p.sku.trim());
    }
    for (const e of initialEntries) {
      if (e.sku?.trim()) set.add(e.sku.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [products, initialEntries]);

  const activeSupplierNames = useMemo(() => {
    const names = suppliers.filter((s) => s.isActive).map((s) => s.name.trim()).filter(Boolean);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [suppliers]);

  const [sku, setSku] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filterSku, setFilterSku] = useState("");

  const filteredHistory = useMemo(() => {
    if (!filterSku.trim()) return initialEntries;
    return initialEntries.filter((e) => e.sku.trim() === filterSku.trim());
  }, [initialEntries, filterSku]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const up = Number(unitPrice);
    if (!sku.trim()) {
      setMessage(en ? "SKU is required." : "请填写 SKU。");
      setLoading(false);
      return;
    }
    if (!Number.isFinite(up) || up < 0) {
      setMessage(en ? "Invalid unit price." : "单价无效。");
      setLoading(false);
      return;
    }
    if (!supplierName.trim()) {
      setMessage(en ? "Supplier is required." : "请选择供应商。");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/cost-control/unit-cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: sku.trim(),
        unitPrice: up,
        taxIncluded,
        supplierName: supplierName.trim(),
        quoteDate: quoteDate.trim(),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || (en ? "Save failed." : "保存失败。"));
      return;
    }
    setMessage(en ? "Saved." : "已保存。");
    setUnitPrice("");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-app-muted">{t.hint}</p>

      <section>
        <h3 className="mb-3 text-base font-semibold text-foreground">{t.title}</h3>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className="block md:col-span-1">
            <span className="mb-1 block text-sm text-foreground/85">{t.sku}</span>
            <input
              list="unit-cost-sku-options"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              required
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
              placeholder={en ? "e.g. IGB4E" : "例如 IGB4E"}
            />
            <datalist id="unit-cost-sku-options">
              {skuOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.unitPrice}</span>
            <input
              type="number"
              min={0}
              step="0.0001"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
            />
          </label>
          <label className="flex items-end gap-2 pb-0.5">
            <input
              type="checkbox"
              checked={taxIncluded}
              onChange={(e) => setTaxIncluded(e.target.checked)}
              className="h-4 w-4 rounded border-app-border"
            />
            <span className="text-sm text-foreground/85">{t.taxIncluded}</span>
          </label>
          <label className="block md:col-span-2 lg:col-span-1">
            <span className="mb-1 block text-sm text-foreground/85">{t.supplier}</span>
            <select
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              required
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
            >
              <option value="">{en ? "Select supplier…" : "选择供应商…"}</option>
              {activeSupplierNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.quoteDate}</span>
            <input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              required
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end md:col-span-2 lg:col-span-1">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
            >
              {loading ? t.saving : t.save}
            </button>
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-app-muted">{message}</p> : null}
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-foreground">{t.history}</h3>
          <label className="flex items-center gap-2 text-sm text-app-muted">
            <span>{t.filterSku}</span>
            <select
              value={filterSku}
              onChange={(e) => setFilterSku(e.target.value)}
              className="rounded-lg border border-app-border bg-app-surface px-2 py-1 text-sm text-foreground"
            >
              <option value="">{t.allSkus}</option>
              {skuOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="app-table-shell overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left text-app-muted">
                <th className="px-2 py-2">{t.quoteDate}</th>
                <th className="px-2 py-2">{t.sku}</th>
                <th className="px-2 py-2">{t.unitPrice}</th>
                <th className="px-2 py-2">{t.taxIncluded}</th>
                <th className="px-2 py-2">{t.supplier}</th>
                <th className="px-2 py-2">{t.by}</th>
                <th className="px-2 py-2">{t.at}</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-2 py-6 text-center text-app-muted">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => (
                  <tr key={row.id} className="border-b border-app-border/60">
                    <td className="px-2 py-2 tabular-nums">{row.quoteDate}</td>
                    <td className="px-2 py-2 font-medium">{row.sku}</td>
                    <td className="px-2 py-2 tabular-nums">{row.unitPrice.toFixed(4)}</td>
                    <td className="px-2 py-2">{row.taxIncluded ? t.yes : t.no}</td>
                    <td className="px-2 py-2">{row.supplierName}</td>
                    <td className="px-2 py-2">{row.createdBy}</td>
                    <td className="px-2 py-2 tabular-nums text-app-muted">
                      {row.createdAt.slice(0, 19).replace("T", " ")}
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
