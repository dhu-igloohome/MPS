"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ccDate,
  ccInputMd,
  ccLabel,
  ccNum,
  ccSelectLg,
  ccSelectSm,
} from "@/components/shared/field-controls";
import { Language } from "@/lib/i18n";
import type {
  MassProductionKanbanEntry,
  MassProductionKanbanRegion,
  ProductItem,
} from "@/lib/types";

const KANBAN_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** In the Kanban table: same calendar year as today → month + day only; otherwise full YYYY-MM-DD. */
function formatKanbanDateCell(value: string | null, language: Language): string {
  if (!value || !KANBAN_DATE_RE.test(value)) return "—";
  const y = Number(value.slice(0, 4));
  const mo = Number(value.slice(5, 7));
  const da = Number(value.slice(8, 10));
  const currentYear = new Date().getFullYear();
  const dt = new Date(y, mo - 1, da);
  if (y === currentYear) {
    return language === "en"
      ? dt.toLocaleDateString("en", { month: "short", day: "numeric" })
      : `${mo}月${da}日`;
  }
  return value;
}

type Props = {
  entries: MassProductionKanbanEntry[];
  products: ProductItem[];
  allowedRegions: MassProductionKanbanRegion[];
  language: Language;
};

function regionOptionLabel(r: MassProductionKanbanRegion, language: Language): string {
  if (r === "Shenzhen office") {
    return language === "en" ? "Shenzhen office" : "深圳办公室";
  }
  return r;
}

function labels(language: Language) {
  const en = language === "en";
  return {
    sectionTitle: en
      ? "Mass production Kanban"
      : "量产看板 · Mass production Kanban",
    sku: "SKU",
    skuHint: en
      ? "Choose a product line from Product Database (active products only)."
      : "从产品数据库选择启用中的产品行。",
    quantity: en ? "Quantity" : "数量",
    mp: "MP",
    ee: "EE",
    me: "ME",
    smt: "SMT",
    assembly: en ? "Assembly" : "Assembly",
    productionReport: en ? "Production report" : "Production report",
    ort: "ORT",
    cooApproval: en ? "COO approval" : "COO approval",
    deliver: en ? "Deliver" : "Deliver",
    region: en ? "Region" : "地区",
    dateHint: en
      ? "YYYY-MM-DD (calendar picker or type manually)."
      : "YYYY-MM-DD（可点选日期或手动输入）。",
    save: en ? "Save" : "保存",
    create: en ? "Create" : "创建",
    cancelEdit: en ? "Cancel edit" : "取消编辑",
    edit: en ? "Edit" : "编辑",
    delete: en ? "Delete" : "删除",
    listTitle: en ? "Kanban rows (your regions)" : "Kanban 列表（您有权限的区域）",
    empty: en ? "No Kanban rows yet." : "暂无 Kanban 记录。",
    colProduct: en ? "Product" : "产品",
    colSku: "SKU",
    colVariant: en ? "Variant" : "规格",
    colBy: en ? "By" : "创建人",
    colActions: en ? "Actions" : "操作",
    deleteConfirm: en ? "Delete this Kanban row?" : "确认删除该 Kanban 行？",
  };
}

function productOptionLabel(p: ProductItem) {
  const v = p.variant?.trim();
  return v ? `${p.productName} · ${p.sku} · ${v}` : `${p.productName} · ${p.sku}`;
}

function emptyDateForm() {
  return {
    ee: "",
    me: "",
    smt: "",
    assembly: "",
    productionReport: "",
    ort: "",
    cooApproval: "",
    deliver: "",
  };
}

export function MassProductionKanbanSection({
  entries,
  products,
  allowedRegions,
  language,
}: Props) {
  const router = useRouter();
  const t = labels(language);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("0");
  const [mp, setMp] = useState("");
  const [dates, setDates] = useState(emptyDateForm);
  const [region, setRegion] = useState<MassProductionKanbanRegion>(
    () => allowedRegions[0] ?? "APAC",
  );
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const productById = useMemo(() => {
    const m = new Map<string, ProductItem>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const resolvedProductId = useMemo(() => {
    if (productId && productById.has(productId)) return productId;
    return products[0]?.id ?? "";
  }, [productId, productById, products]);

  const resolvedRegion = useMemo(() => {
    return allowedRegions.includes(region) ? region : (allowedRegions[0] ?? "APAC");
  }, [allowedRegions, region]);

  function resetForm() {
    setEditingId(null);
    setProductId(products[0]?.id ?? "");
    setQuantity("0");
    setMp("");
    setDates(emptyDateForm());
    if (allowedRegions[0]) setRegion(allowedRegions[0]);
    setMessage("");
  }

  function startEdit(row: MassProductionKanbanEntry) {
    setEditingId(row.id);
    setProductId(row.productId);
    setQuantity(String(row.quantity));
    setMp(row.mp);
    setDates({
      ee: row.ee ?? "",
      me: row.me ?? "",
      smt: row.smt ?? "",
      assembly: row.assembly ?? "",
      productionReport: row.productionReport ?? "",
      ort: row.ort ?? "",
      cooApproval: row.cooApproval ?? "",
      deliver: row.deliver ?? "",
    });
    setRegion(row.region);
    setMessage("");
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const payload = {
      productId: resolvedProductId,
      quantity: Number(quantity),
      mp,
      ee: dates.ee.trim(),
      me: dates.me.trim(),
      smt: dates.smt.trim(),
      assembly: dates.assembly.trim(),
      productionReport: dates.productionReport.trim(),
      ort: dates.ort.trim(),
      cooApproval: dates.cooApproval.trim(),
      deliver: dates.deliver.trim(),
      region: resolvedRegion,
    };
    try {
      const url = editingId
        ? `/api/mass-production-kanban/${encodeURIComponent(editingId)}`
        : "/api/mass-production-kanban";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        setMessage(data.message || "Request failed");
        setLoading(false);
        return;
      }
      resetForm();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm(t.deleteConfirm)) return;
    setLoading(true);
    setMessage("");
    const res = await fetch(`/api/mass-production-kanban/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || "Delete failed");
      return;
    }
    if (editingId === id) resetForm();
    router.refresh();
  }

  if (allowedRegions.length === 0) {
    return null;
  }

  return (
    <section
      id="mass-production-kanban"
      className="app-card scroll-mt-4 border-l-4 border-l-[var(--app-accent)] p-5"
    >
      <h3 className="text-lg font-semibold text-foreground">{t.sectionTitle}</h3>
      <details className="mt-1 text-xs text-app-muted">
        <summary className="cursor-pointer select-none font-medium text-foreground/80">
          {language === "en" ? "Kanban overview" : "看板说明"}
        </summary>
        <p className="mt-1 max-w-3xl leading-relaxed">
          {language === "en"
            ? "Track mass production milestones per product/SKU and region (MP, dates, ORT, etc.)."
            : "按产品/SKU 与区域维护量产节点（MP、各工序日期、ORT 等）。"}
        </p>
        <p className="mt-1 max-w-3xl leading-relaxed">{t.skuHint}</p>
        <p className="mt-1 max-w-3xl leading-relaxed">{t.dateHint}</p>
      </details>

      <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={onSubmit}>
        <label className="min-w-0 shrink-0">
          <span className={ccLabel}>{t.sku}</span>
          <select
            value={resolvedProductId}
            onChange={(e) => setProductId(e.target.value)}
            required
            disabled={products.length === 0}
            className={ccSelectLg}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {productOptionLabel(p)}
              </option>
            ))}
          </select>
        </label>

        <label className="shrink-0">
          <span className={ccLabel}>{t.quantity}</span>
          <input
            type="number"
            min={0}
            step={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className={`${ccNum} outline-none ring-app-accent focus:ring-2`}
          />
        </label>

        <label className="min-w-0 shrink-0">
          <span className={ccLabel}>{t.mp}</span>
          <input
            value={mp}
            onChange={(e) => setMp(e.target.value)}
            className={`${ccInputMd} max-w-[16rem] outline-none ring-app-accent focus:ring-2`}
            maxLength={2000}
          />
        </label>

        {(
          [
            ["ee", t.ee],
            ["me", t.me],
            ["smt", t.smt],
            ["assembly", t.assembly],
            ["productionReport", t.productionReport],
            ["ort", t.ort],
            ["cooApproval", t.cooApproval],
            ["deliver", t.deliver],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="shrink-0" title={t.dateHint}>
            <span className={ccLabel}>{label}</span>
            <input
              type="date"
              value={dates[key]}
              onChange={(e) => setDates((d) => ({ ...d, [key]: e.target.value }))}
              className={`${ccDate} outline-none ring-app-accent focus:ring-2`}
            />
          </label>
        ))}

        <label className="shrink-0">
          <span className={ccLabel}>{t.region}</span>
          <select
            value={resolvedRegion}
            onChange={(e) => setRegion(e.target.value as MassProductionKanbanRegion)}
            className={ccSelectSm}
          >
            {allowedRegions.map((r) => (
              <option key={r} value={r}>
                {regionOptionLabel(r, language)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={loading || products.length === 0}
          className="shrink-0 rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
        >
          {loading ? "..." : editingId ? t.save : t.create}
        </button>
        {editingId ? (
          <button
            type="button"
            onClick={resetForm}
            className="app-button-secondary shrink-0 px-4 py-2 text-sm text-foreground/85 hover:bg-app-accent-soft"
          >
            {t.cancelEdit}
          </button>
        ) : null}
      </form>

      {message ? <p className="mt-3 text-sm text-red-600">{message}</p> : null}

      {products.length === 0 ? (
        <p className="mt-4 text-sm text-amber-800">
          {language === "en"
            ? "No active products. Add products in NPI Management > Product Database first."
            : "没有启用中的产品，请先在 NPI 管理 > 产品数据库 中维护。"}
        </p>
      ) : null}

      <h4 className="mt-8 text-base font-semibold text-foreground">{t.listTitle}</h4>
      <div className="app-table-shell mt-3 overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-2 py-2">{t.colProduct}</th>
              <th className="px-2 py-2">{t.colSku}</th>
              <th className="px-2 py-2">{t.colVariant}</th>
              <th className="px-2 py-2">{t.quantity}</th>
              <th className="px-2 py-2">{t.mp}</th>
              <th className="px-2 py-2">{t.ee}</th>
              <th className="px-2 py-2">{t.me}</th>
              <th className="px-2 py-2">{t.smt}</th>
              <th className="px-2 py-2">{t.assembly}</th>
              <th className="px-2 py-2">{t.productionReport}</th>
              <th className="px-2 py-2">{t.ort}</th>
              <th className="px-2 py-2">{t.cooApproval}</th>
              <th className="px-2 py-2">{t.deliver}</th>
              <th className="px-2 py-2">{t.region}</th>
              <th className="px-2 py-2">{t.colBy}</th>
              <th className="px-2 py-2">{t.colActions}</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-2 py-6 text-center text-app-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr key={row.id}>
                  <td className="px-2 py-2">{row.productName}</td>
                  <td className="px-2 py-2">{row.sku}</td>
                  <td className="px-2 py-2">{row.variant || "—"}</td>
                  <td className="px-2 py-2 tabular-nums">{row.quantity}</td>
                  <td className="max-w-[10rem] px-2 py-2 break-words">{row.mp || "—"}</td>
                  <td className="px-2 py-2 tabular-nums">{formatKanbanDateCell(row.ee, language)}</td>
                  <td className="px-2 py-2 tabular-nums">{formatKanbanDateCell(row.me, language)}</td>
                  <td className="px-2 py-2 tabular-nums">{formatKanbanDateCell(row.smt, language)}</td>
                  <td className="px-2 py-2 tabular-nums">{formatKanbanDateCell(row.assembly, language)}</td>
                  <td className="px-2 py-2 tabular-nums">{formatKanbanDateCell(row.productionReport, language)}</td>
                  <td className="px-2 py-2 tabular-nums">{formatKanbanDateCell(row.ort, language)}</td>
                  <td className="px-2 py-2 tabular-nums">{formatKanbanDateCell(row.cooApproval, language)}</td>
                  <td className="px-2 py-2 tabular-nums">{formatKanbanDateCell(row.deliver, language)}</td>
                  <td className="px-2 py-2">{regionOptionLabel(row.region, language)}</td>
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
  );
}
