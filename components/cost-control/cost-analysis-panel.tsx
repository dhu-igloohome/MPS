"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { suggestCheckTotalVsQtyUnit } from "@/lib/cost-analysis-validation";
import type { Language } from "@/lib/i18n";
import type { CostAnalysisEntry, CostFreightMode } from "@/lib/types";

const SUPPLIER_SUGGESTIONS = [
  "达美",
  "bolan-DK",
  "bolan-Yastar",
  "DK",
  "金润",
  "VS",
  "IBE",
  "Aztech",
  "Partnersonic",
  "海成",
  "嘉顿",
  "Hull",
  "huili优化",
  "Solity",
  "TW Fuxin",
];

type CostAnalysisPanelProps = {
  language: Language;
  initialEntries: CostAnalysisEntry[];
};

function emptyRow(): Omit<CostAnalysisEntry, "id" | "createdBy" | "createdAt" | "updatedAt"> {
  return {
    cmRegion: "",
    supplierName: "",
    sku: "",
    quantity: 0,
    orderNumber: "",
    orderTotalWithTariff: 0,
    orderTotalWithoutTariff: 0,
    unitCostWithTariff: 0,
    unitCostWithoutTariff: 0,
    includesChinaVat: false,
    baseUnitCostUsd: 0,
    eeCost: 0,
    meCost: 0,
    assemblyCost: 0,
    tariffPct: 0,
    airFreightPerUnit: 0,
    seaFreightPerUnit: 0,
    destinationCountry: "",
    freightMode: "sea",
    remarks: "",
  };
}

const LABELS = {
  en: {
    hint: "Rules: tariff 0–100%; freight = air or sea. Totals may be entered as in Excel (cross-check hints below).",
    add: "Add row",
    save: "Save",
    cancel: "Cancel edit",
    edit: "Edit",
    delete: "Delete",
    cmRegion: "CM region",
    supplier: "Supplier",
    sku: "SKU",
    qty: "Order qty",
    orderNo: "Order no.",
    totalWithTariff: "Order total (incl. tariff)",
    totalWoTariff: "Order total (excl. tariff)",
    ucWithTariff: "Unit cost (incl. tariff)",
    ucWoTariff: "Unit cost (excl. tariff)",
    chinaVat: "Unit cost incl. China VAT",
    baseUnit: "Unit cost (USD)",
    ee: "EE cost",
    me: "ME cost",
    assembly: "Assembly cost",
    tariff: "Tariff %",
    airFreight: "Air freight / unit",
    seaFreight: "Sea freight / unit",
    dest: "Destination country",
    freight: "Air / Sea",
    remark: "Remarks",
    hintWith: "Check incl. tariff",
    hintWo: "Check excl. tariff",
    yes: "Yes",
    no: "No",
  },
  zh: {
    hint: "规则：关税 0～100%；运输方式为空运或海运。订单全额可与 Excel 手填一致，下方仅作参考提示。",
    add: "新增一行",
    save: "保存",
    cancel: "取消编辑",
    edit: "编辑",
    delete: "删除",
    cmRegion: "CM region",
    supplier: "Supplier name",
    sku: "SKU",
    qty: "订单数量",
    orderNo: "订单号",
    totalWithTariff: "订单全额包含 tariff",
    totalWoTariff: "订单全额不包含 tariff",
    ucWithTariff: "unit cost 包含 tariff",
    ucWoTariff: "unit cost 不包含 tariff",
    chinaVat: "unit cost 是否含中国增值税",
    baseUnit: "Unit cost (USD)",
    ee: "EE cost",
    me: "ME cost",
    assembly: "assembly cost",
    tariff: "tariff %",
    airFreight: "air freight cost per unit",
    seaFreight: "sea freight cost per unit",
    dest: "目的地国家",
    freight: "选择空运还是海运",
    remark: "备注",
    hintWith: "参考：数量×含关税单价",
    hintWo: "参考：数量×不含关税单价",
    yes: "是",
    no: "不",
  },
};

export function CostAnalysisPanel({ language, initialEntries }: CostAnalysisPanelProps) {
  const router = useRouter();
  const t = LABELS[language];
  const [entries, setEntries] = useState(initialEntries);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState(emptyRow);

  useEffect(() => {
    setEntries(initialEntries);
  }, [initialEntries]);

  const checkWith = useMemo(
    () => suggestCheckTotalVsQtyUnit(form.quantity, form.unitCostWithTariff, form.orderTotalWithTariff),
    [form.quantity, form.unitCostWithTariff, form.orderTotalWithTariff],
  );
  const checkWo = useMemo(
    () => suggestCheckTotalVsQtyUnit(form.quantity, form.unitCostWithoutTariff, form.orderTotalWithoutTariff),
    [form.quantity, form.unitCostWithoutTariff, form.orderTotalWithoutTariff],
  );

  function fillFromEntry(e: CostAnalysisEntry) {
    setEditingId(e.id);
    setForm({
      cmRegion: e.cmRegion,
      supplierName: e.supplierName,
      sku: e.sku,
      quantity: e.quantity,
      orderNumber: e.orderNumber,
      orderTotalWithTariff: e.orderTotalWithTariff,
      orderTotalWithoutTariff: e.orderTotalWithoutTariff,
      unitCostWithTariff: e.unitCostWithTariff,
      unitCostWithoutTariff: e.unitCostWithoutTariff,
      includesChinaVat: e.includesChinaVat,
      baseUnitCostUsd: e.baseUnitCostUsd,
      eeCost: e.eeCost,
      meCost: e.meCost,
      assemblyCost: e.assemblyCost,
      tariffPct: e.tariffPct,
      airFreightPerUnit: e.airFreightPerUnit,
      seaFreightPerUnit: e.seaFreightPerUnit,
      destinationCountry: e.destinationCountry,
      freightMode: e.freightMode,
      remarks: e.remarks,
    });
  }

  function reset() {
    setEditingId(null);
    setForm(emptyRow());
    setMessage("");
  }

  async function refresh() {
    const res = await fetch("/api/cost-control/cost-analysis");
    const data = (await res.json()) as { entries?: CostAnalysisEntry[] };
    if (data.entries) setEntries(data.entries);
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const payload = { ...form };
    const res = editingId
      ? await fetch(`/api/cost-control/cost-analysis/${encodeURIComponent(editingId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/cost-control/cost-analysis", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || "Request failed");
      return;
    }
    reset();
    await refresh();
  }

  async function onDelete(id: string) {
    if (!confirm(language === "en" ? "Delete this row?" : "确定删除此行？")) return;
    setLoading(true);
    const res = await fetch(`/api/cost-control/cost-analysis/${encodeURIComponent(id)}`, { method: "DELETE" });
    setLoading(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setMessage(data.message || "Delete failed");
      return;
    }
    if (editingId === id) reset();
    await refresh();
  }

  const inputBase =
    "mt-1 w-full rounded-lg border border-app-border px-2 py-1.5 text-sm text-foreground";

  return (
    <div className="space-y-4">
      <p className="text-sm text-app-muted">{t.hint}</p>

      <div className="overflow-x-auto rounded-xl border border-app-border/90">
        <table className="w-full min-w-[1600px] border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-app-border/80 bg-app-surface/80 text-left text-app-muted">
              <th className="px-1 py-2">{t.cmRegion}</th>
              <th className="px-1 py-2">{t.supplier}</th>
              <th className="px-1 py-2">{t.sku}</th>
              <th className="px-1 py-2">{t.qty}</th>
              <th className="px-1 py-2">{t.orderNo}</th>
              <th className="px-1 py-2">{t.totalWithTariff}</th>
              <th className="px-1 py-2">{t.totalWoTariff}</th>
              <th className="px-1 py-2">{t.ucWithTariff}</th>
              <th className="px-1 py-2">{t.ucWoTariff}</th>
              <th className="px-1 py-2">{t.chinaVat}</th>
              <th className="px-1 py-2">{t.baseUnit}</th>
              <th className="px-1 py-2">{t.ee}</th>
              <th className="px-1 py-2">{t.me}</th>
              <th className="px-1 py-2">{t.assembly}</th>
              <th className="px-1 py-2">{t.tariff}</th>
              <th className="px-1 py-2">{t.airFreight}</th>
              <th className="px-1 py-2">{t.seaFreight}</th>
              <th className="px-1 py-2">{t.dest}</th>
              <th className="px-1 py-2">{t.freight}</th>
              <th className="px-1 py-2">{t.remark}</th>
              <th className="px-1 py-2"> </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={21} className="px-2 py-6 text-center text-app-muted">
                  {language === "en" ? "No rows yet." : "暂无数据。"}
                </td>
              </tr>
            ) : (
              entries.map((row) => (
                <tr key={row.id} className="border-b border-app-border/40">
                  <td className="px-1 py-2">{row.cmRegion || "—"}</td>
                  <td className="max-w-[8rem] break-words px-1 py-2">{row.supplierName || "—"}</td>
                  <td className="px-1 py-2 font-medium">{row.sku}</td>
                  <td className="px-1 py-2 text-right">{row.quantity}</td>
                  <td className="max-w-[10rem] break-all px-1 py-2">{row.orderNumber}</td>
                  <td className="px-1 py-2 text-right">{row.orderTotalWithTariff.toFixed(2)}</td>
                  <td className="px-1 py-2 text-right">{row.orderTotalWithoutTariff.toFixed(2)}</td>
                  <td className="px-1 py-2 text-right">{row.unitCostWithTariff.toFixed(2)}</td>
                  <td className="px-1 py-2 text-right">{row.unitCostWithoutTariff.toFixed(2)}</td>
                  <td className="px-1 py-2">{row.includesChinaVat ? t.yes : t.no}</td>
                  <td className="px-1 py-2 text-right">{row.baseUnitCostUsd.toFixed(2)}</td>
                  <td className="px-1 py-2 text-right">{row.eeCost.toFixed(2)}</td>
                  <td className="px-1 py-2 text-right">{row.meCost.toFixed(2)}</td>
                  <td className="px-1 py-2 text-right">{row.assemblyCost.toFixed(2)}</td>
                  <td className="px-1 py-2 text-right">{row.tariffPct}%</td>
                  <td className="px-1 py-2 text-right">{row.airFreightPerUnit.toFixed(2)}</td>
                  <td className="px-1 py-2 text-right">{row.seaFreightPerUnit.toFixed(2)}</td>
                  <td className="px-1 py-2">{row.destinationCountry || "—"}</td>
                  <td className="px-1 py-2">{row.freightMode === "air" ? (language === "en" ? "Air" : "空运") : language === "en" ? "Sea" : "海运"}</td>
                  <td className="max-w-[8rem] break-words px-1 py-2">{row.remarks || "—"}</td>
                  <td className="whitespace-nowrap px-1 py-2">
                    <button type="button" className="mr-1 text-app-accent hover:underline" onClick={() => fillFromEntry(row)}>
                      {t.edit}
                    </button>
                    <button type="button" className="text-red-600 hover:underline" onClick={() => onDelete(row.id)} disabled={loading}>
                      {t.delete}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form className="rounded-2xl border border-app-border/90 bg-app-surface/50 p-4" onSubmit={onSubmit}>
        <p className="mb-3 text-sm font-medium text-foreground">{editingId ? (language === "en" ? "Edit row" : "编辑行") : t.add}</p>

        <datalist id="supplier-suggestions-cost">
          {SUPPLIER_SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <label className="text-sm">
            {t.cmRegion}
            <input className={inputBase} value={form.cmRegion} onChange={(e) => setForm((f) => ({ ...f, cmRegion: e.target.value }))} />
          </label>
          <label className="text-sm">
            {t.supplier}
            <input className={inputBase} list="supplier-suggestions-cost" value={form.supplierName} onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))} />
          </label>
          <label className="text-sm">
            {t.sku}
            <input className={inputBase} value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} required />
          </label>
          <label className="text-sm">
            {t.qty}
            <input type="number" min={0} step={1} className={inputBase} value={form.quantity || ""} onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) || 0 }))} required />
          </label>
          <label className="text-sm sm:col-span-2">
            {t.orderNo}
            <input className={inputBase} value={form.orderNumber} onChange={(e) => setForm((f) => ({ ...f, orderNumber: e.target.value }))} required />
          </label>
          <label className="text-sm">
            {t.totalWithTariff}
            <input type="number" min={0} step="0.01" className={inputBase} value={form.orderTotalWithTariff || ""} onChange={(e) => setForm((f) => ({ ...f, orderTotalWithTariff: Number(e.target.value) || 0 }))} />
          </label>
          <label className="text-sm">
            {t.totalWoTariff}
            <input type="number" min={0} step="0.01" className={inputBase} value={form.orderTotalWithoutTariff || ""} onChange={(e) => setForm((f) => ({ ...f, orderTotalWithoutTariff: Number(e.target.value) || 0 }))} />
          </label>
          <label className="text-sm">
            {t.ucWithTariff}
            <input type="number" min={0} step="0.0001" className={inputBase} value={form.unitCostWithTariff || ""} onChange={(e) => setForm((f) => ({ ...f, unitCostWithTariff: Number(e.target.value) || 0 }))} />
          </label>
          <label className="text-sm">
            {t.ucWoTariff}
            <input type="number" min={0} step="0.0001" className={inputBase} value={form.unitCostWithoutTariff || ""} onChange={(e) => setForm((f) => ({ ...f, unitCostWithoutTariff: Number(e.target.value) || 0 }))} />
          </label>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-app-border"
              checked={form.includesChinaVat}
              onChange={(e) => setForm((f) => ({ ...f, includesChinaVat: e.target.checked }))}
            />
            <span>{t.chinaVat}</span>
          </label>
          <label className="text-sm">
            {t.baseUnit}
            <input type="number" min={0} step="0.01" className={inputBase} value={form.baseUnitCostUsd || ""} onChange={(e) => setForm((f) => ({ ...f, baseUnitCostUsd: Number(e.target.value) || 0 }))} />
          </label>
          <label className="text-sm">
            {t.ee}
            <input type="number" min={0} step="0.01" className={inputBase} value={form.eeCost || ""} onChange={(e) => setForm((f) => ({ ...f, eeCost: Number(e.target.value) || 0 }))} />
          </label>
          <label className="text-sm">
            {t.me}
            <input type="number" min={0} step="0.01" className={inputBase} value={form.meCost || ""} onChange={(e) => setForm((f) => ({ ...f, meCost: Number(e.target.value) || 0 }))} />
          </label>
          <label className="text-sm">
            {t.assembly}
            <input type="number" min={0} step="0.01" className={inputBase} value={form.assemblyCost || ""} onChange={(e) => setForm((f) => ({ ...f, assemblyCost: Number(e.target.value) || 0 }))} />
          </label>
          <label className="text-sm">
            {t.tariff}
            <input type="number" min={0} max={100} step="0.1" className={inputBase} value={form.tariffPct || ""} onChange={(e) => setForm((f) => ({ ...f, tariffPct: Number(e.target.value) || 0 }))} />
          </label>
          <label className="text-sm">
            {t.airFreight}
            <input type="number" min={0} step="0.01" className={inputBase} value={form.airFreightPerUnit || ""} onChange={(e) => setForm((f) => ({ ...f, airFreightPerUnit: Number(e.target.value) || 0 }))} />
          </label>
          <label className="text-sm">
            {t.seaFreight}
            <input type="number" min={0} step="0.01" className={inputBase} value={form.seaFreightPerUnit || ""} onChange={(e) => setForm((f) => ({ ...f, seaFreightPerUnit: Number(e.target.value) || 0 }))} />
          </label>
          <label className="text-sm">
            {t.dest}
            <input className={inputBase} value={form.destinationCountry} onChange={(e) => setForm((f) => ({ ...f, destinationCountry: e.target.value }))} />
          </label>
          <label className="text-sm">
            {t.freight}
            <select
              className={inputBase}
              value={form.freightMode}
              onChange={(e) => setForm((f) => ({ ...f, freightMode: e.target.value as CostFreightMode }))}
            >
              <option value="air">{language === "en" ? "Air" : "空运"}</option>
              <option value="sea">{language === "en" ? "Sea" : "海运"}</option>
            </select>
          </label>
          <label className="text-sm sm:col-span-2">
            {t.remark}
            <input className={inputBase} value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          </label>
        </div>

        <p className="mt-2 text-xs text-app-muted">
          {t.hintWith}: {checkWith.close ? "✓" : `Δ ${checkWith.diff.toFixed(2)}`} · {t.hintWo}:{" "}
          {checkWo.close ? "✓" : `Δ ${checkWo.diff.toFixed(2)}`}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60">
            {t.save}
          </button>
          {editingId ? (
            <button type="button" className="rounded-lg border border-app-border px-4 py-2 text-sm" onClick={reset}>
              {t.cancel}
            </button>
          ) : null}
        </div>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </form>
    </div>
  );
}
