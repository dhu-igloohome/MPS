"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  buildForecastDestinationOptions,
  forecastDestinationDisplay,
  withLegacyForecastDestination,
} from "@/lib/forecast-destination-countries";
import type { Language } from "@/lib/i18n";
import type { ProductItem, SupplierEntry, UnitCostQuoteEntry, UnitCostQuoteIncoterm } from "@/lib/types";

type Props = {
  language: Language;
  initialEntries: UnitCostQuoteEntry[];
  products: ProductItem[];
  suppliers: SupplierEntry[];
};

function fmtPct(v: number | null, na: string): string {
  if (v == null) return na;
  return `${v.toFixed(2)}%`;
}

function fmtUsd(v: number | null, na: string): string {
  if (v == null) return na;
  return v.toFixed(4);
}

/** 生产商国家下拉（与报价存储英文一致）；编辑时若历史值不在列表则追加一项 */
const MANUFACTURER_COUNTRY_OPTIONS = [
  "China",
  "Malaysia",
  "Korea",
  "Vietnam",
  "Taiwan China",
  "Singapore",
  "Indonesia",
  "Thailand",
] as const;

const MANUFACTURER_COUNTRY_SET = new Set<string>(MANUFACTURER_COUNTRY_OPTIONS);

function manufacturerCountrySelectOptions(currentValue: string): string[] {
  const v = currentValue.trim();
  const list: string[] = [...MANUFACTURER_COUNTRY_OPTIONS];
  if (v && !MANUFACTURER_COUNTRY_SET.has(v)) list.push(v);
  return list;
}

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
    na: en ? "—" : "—",
    manufacturerCountry: en ? "Manufacturer country" : "生产商国家",
    selectMfrCountry: en ? "Select country…" : "选择国家…",
    destinationCountry: en ? "Destination country" : "目的国",
    selectDestinationCountry: en ? "Select destination country (optional)…" : "选择目的国（选填）…",
    destinationCountryHint: en
      ? "English name is stored; TW/HK/MO use Taiwan, China / Hong Kong, China / Macau, China."
      : "保存英文标准名称；台湾/香港/澳门在中文界面显示为中国台湾、中国香港、中国澳门。",
    destinationTariff: en ? "Destination tariff (%)" : "目的国关税 (%)",
    seaMode: en ? "Shipping: ocean" : "运输方式 · 海运",
    seaFreightUnit: en ? "Ocean freight (USD / unit)" : "海运运费单价 (USD)",
    airMode: en ? "Shipping: air" : "运输方式 · 空运",
    airFreightUnit: en ? "Air freight (USD / unit)" : "空运运费单价 (USD)",
    incoterm: "Incoterm",
    incotermExw: "EXW",
    incotermFob: "FOB",
    incotermDap: "DAP",
    incotermDdp: "DDP",
    hint: en
      ? "Supplier names match Supply Chain → Suppliers (active). Add a row for each new quote; history lists all records."
      : "供应商名称与「供应链 → 供应商」中启用供应商一致。每次新报价保存一条；下方为全部历史记录，可按 SKU 筛选。",
    edit: en ? "Edit" : "编辑",
    editTitle: en ? "Edit quotation" : "编辑报价",
    cancel: en ? "Cancel" : "取消",
    saveChanges: en ? "Save changes" : "保存修改",
    savingEdit: en ? "Saving…" : "保存中…",
  };

  const destinationOptions = useMemo(() => buildForecastDestinationOptions(), []);

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
  const [manufacturerCountry, setManufacturerCountry] = useState("");
  const [destinationCountry, setDestinationCountry] = useState("");
  const [destinationTariffPct, setDestinationTariffPct] = useState("");
  const [seaFreightUnitPrice, setSeaFreightUnitPrice] = useState("");
  const [airFreightUnitPrice, setAirFreightUnitPrice] = useState("");
  const [incoterm, setIncoterm] = useState<UnitCostQuoteIncoterm>("EXW");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [filterSku, setFilterSku] = useState("");

  const [editRow, setEditRow] = useState<UnitCostQuoteEntry | null>(null);
  const [eSku, setEsku] = useState("");
  const [eUnitPrice, setEUnitPrice] = useState("");
  const [eTaxIncluded, setETaxIncluded] = useState(false);
  const [eSupplierName, setESupplierName] = useState("");
  const [eQuoteDate, setEQuoteDate] = useState("");
  const [eManufacturerCountry, setEManufacturerCountry] = useState("");
  const [eDestinationCountry, setEDestinationCountry] = useState("");
  const [eDestinationTariffPct, setEDestinationTariffPct] = useState("");
  const [eSeaFreightUnitPrice, setESeaFreightUnitPrice] = useState("");
  const [eAirFreightUnitPrice, setEAirFreightUnitPrice] = useState("");
  const [eIncoterm, setEIncoterm] = useState<UnitCostQuoteIncoterm>("EXW");
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState("");

  const editDestinationOptions = useMemo(
    () => withLegacyForecastDestination(eDestinationCountry, destinationOptions),
    [eDestinationCountry, destinationOptions],
  );

  const supplierOptionsForEdit = useMemo(() => {
    const set = new Set(activeSupplierNames);
    if (editRow?.supplierName.trim()) set.add(editRow.supplierName.trim());
    if (eSupplierName.trim()) set.add(eSupplierName.trim());
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [activeSupplierNames, editRow, eSupplierName]);

  function openEdit(row: UnitCostQuoteEntry) {
    setEditRow(row);
    setEsku(row.sku);
    setEUnitPrice(String(row.unitPrice));
    setETaxIncluded(row.taxIncluded);
    setESupplierName(row.supplierName);
    setEQuoteDate(row.quoteDate);
    setEManufacturerCountry(row.manufacturerCountry);
    setEDestinationCountry(row.destinationCountry);
    setEDestinationTariffPct(row.destinationTariffPct != null ? String(row.destinationTariffPct) : "");
    setESeaFreightUnitPrice(row.seaFreightUnitPrice != null ? String(row.seaFreightUnitPrice) : "");
    setEAirFreightUnitPrice(row.airFreightUnitPrice != null ? String(row.airFreightUnitPrice) : "");
    setEIncoterm(row.incoterm);
    setEditMessage("");
  }

  function closeEdit() {
    setEditRow(null);
    setEditMessage("");
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    setEditLoading(true);
    setEditMessage("");
    const up = Number(eUnitPrice);
    if (!eSku.trim()) {
      setEditMessage(en ? "SKU is required." : "请填写 SKU。");
      setEditLoading(false);
      return;
    }
    if (!Number.isFinite(up) || up < 0) {
      setEditMessage(en ? "Invalid unit price." : "单价无效。");
      setEditLoading(false);
      return;
    }
    if (!eSupplierName.trim()) {
      setEditMessage(en ? "Supplier is required." : "请选择供应商。");
      setEditLoading(false);
      return;
    }
    const res = await fetch(`/api/cost-control/unit-cost/${editRow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: eSku.trim(),
        unitPrice: up,
        taxIncluded: eTaxIncluded,
        supplierName: eSupplierName.trim(),
        quoteDate: eQuoteDate.trim(),
        manufacturerCountry: eManufacturerCountry.trim(),
        destinationCountry: eDestinationCountry.trim(),
        destinationTariffPct: eDestinationTariffPct.trim() === "" ? null : Number(eDestinationTariffPct),
        seaFreightUnitPrice: eSeaFreightUnitPrice.trim() === "" ? null : Number(eSeaFreightUnitPrice),
        airFreightUnitPrice: eAirFreightUnitPrice.trim() === "" ? null : Number(eAirFreightUnitPrice),
        incoterm: eIncoterm,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setEditLoading(false);
    if (!res.ok) {
      setEditMessage(data.message || (en ? "Save failed." : "保存失败。"));
      return;
    }
    closeEdit();
    router.refresh();
  }

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
        manufacturerCountry: manufacturerCountry.trim(),
        destinationCountry: destinationCountry.trim(),
        destinationTariffPct: destinationTariffPct.trim() === "" ? null : Number(destinationTariffPct),
        seaFreightUnitPrice: seaFreightUnitPrice.trim() === "" ? null : Number(seaFreightUnitPrice),
        airFreightUnitPrice: airFreightUnitPrice.trim() === "" ? null : Number(airFreightUnitPrice),
        incoterm,
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
    setManufacturerCountry("");
    setDestinationCountry("");
    setDestinationTariffPct("");
    setSeaFreightUnitPrice("");
    setAirFreightUnitPrice("");
    setIncoterm("EXW");
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-app-muted">{t.hint}</p>

      <section>
        <h3 className="mb-3 text-base font-semibold text-foreground">{t.title}</h3>
        <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          <label className="block md:col-span-2 xl:col-span-1">
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
          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.manufacturerCountry}</span>
            <select
              value={manufacturerCountry}
              onChange={(e) => setManufacturerCountry(e.target.value)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
            >
              <option value="">{t.selectMfrCountry}</option>
              {manufacturerCountrySelectOptions(manufacturerCountry).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.destinationCountry}</span>
            <select
              value={destinationCountry}
              onChange={(e) => setDestinationCountry(e.target.value)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
            >
              <option value="">{t.selectDestinationCountry}</option>
              {destinationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {en ? opt.labelEn : opt.labelZh}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-app-muted">{t.destinationCountryHint}</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.destinationTariff}</span>
            <input
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={destinationTariffPct}
              onChange={(e) => setDestinationTariffPct(e.target.value)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
              placeholder={en ? "Optional" : "选填"}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.seaMode}</span>
            <span className="mb-1 block text-xs text-app-muted">{t.seaFreightUnit}</span>
            <input
              type="number"
              min={0}
              step="0.0001"
              value={seaFreightUnitPrice}
              onChange={(e) => setSeaFreightUnitPrice(e.target.value)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
              placeholder={en ? "Optional" : "选填"}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.airMode}</span>
            <span className="mb-1 block text-xs text-app-muted">{t.airFreightUnit}</span>
            <input
              type="number"
              min={0}
              step="0.0001"
              value={airFreightUnitPrice}
              onChange={(e) => setAirFreightUnitPrice(e.target.value)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
              placeholder={en ? "Optional" : "选填"}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-foreground/85">{t.incoterm}</span>
            <select
              value={incoterm}
              onChange={(e) => setIncoterm(e.target.value as UnitCostQuoteIncoterm)}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
            >
              <option value="EXW">{t.incotermExw}</option>
              <option value="FOB">{t.incotermFob}</option>
              <option value="DAP">{t.incotermDap}</option>
              <option value="DDP">{t.incotermDdp}</option>
            </select>
          </label>
          <div className="flex items-end xl:col-span-1">
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

      {editRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-labelledby="unit-cost-edit-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) closeEdit();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 id="unit-cost-edit-title" className="text-base font-semibold text-foreground">
                {t.editTitle}
              </h3>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg border border-app-border px-2.5 py-1 text-sm text-foreground/80 hover:bg-app-accent-soft"
              >
                {t.cancel}
              </button>
            </div>
            <form onSubmit={onSaveEdit} className="grid gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-1">
                <span className="mb-1 block text-sm text-foreground/85">{t.sku}</span>
                <input
                  list="unit-cost-sku-options-edit"
                  value={eSku}
                  onChange={(ev) => setEsku(ev.target.value)}
                  required
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                />
                <datalist id="unit-cost-sku-options-edit">
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
                  value={eUnitPrice}
                  onChange={(ev) => setEUnitPrice(ev.target.value)}
                  required
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                />
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={eTaxIncluded}
                  onChange={(ev) => setETaxIncluded(ev.target.checked)}
                  className="h-4 w-4 rounded border-app-border"
                />
                <span className="text-sm text-foreground/85">{t.taxIncluded}</span>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-foreground/85">{t.supplier}</span>
                <select
                  value={eSupplierName}
                  onChange={(ev) => setESupplierName(ev.target.value)}
                  required
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                >
                  <option value="">{en ? "Select supplier…" : "选择供应商…"}</option>
                  {supplierOptionsForEdit.map((name) => (
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
                  value={eQuoteDate}
                  onChange={(ev) => setEQuoteDate(ev.target.value)}
                  required
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-foreground/85">{t.manufacturerCountry}</span>
                <select
                  value={eManufacturerCountry}
                  onChange={(ev) => setEManufacturerCountry(ev.target.value)}
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                >
                  <option value="">{t.selectMfrCountry}</option>
                  {manufacturerCountrySelectOptions(eManufacturerCountry).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-foreground/85">{t.destinationCountry}</span>
                <select
                  value={eDestinationCountry}
                  onChange={(ev) => setEDestinationCountry(ev.target.value)}
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                >
                  <option value="">{t.selectDestinationCountry}</option>
                  {editDestinationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {en ? opt.labelEn : opt.labelZh}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-app-muted">{t.destinationCountryHint}</span>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm text-foreground/85">{t.destinationTariff}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={eDestinationTariffPct}
                  onChange={(ev) => setEDestinationTariffPct(ev.target.value)}
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-foreground/85">{t.seaMode}</span>
                <span className="mb-1 block text-xs text-app-muted">{t.seaFreightUnit}</span>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={eSeaFreightUnitPrice}
                  onChange={(ev) => setESeaFreightUnitPrice(ev.target.value)}
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-foreground/85">{t.airMode}</span>
                <span className="mb-1 block text-xs text-app-muted">{t.airFreightUnit}</span>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={eAirFreightUnitPrice}
                  onChange={(ev) => setEAirFreightUnitPrice(ev.target.value)}
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-sm text-foreground/85">{t.incoterm}</span>
                <select
                  value={eIncoterm}
                  onChange={(ev) => setEIncoterm(ev.target.value as UnitCostQuoteIncoterm)}
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                >
                  <option value="EXW">{t.incotermExw}</option>
                  <option value="FOB">{t.incotermFob}</option>
                  <option value="DAP">{t.incotermDap}</option>
                  <option value="DDP">{t.incotermDdp}</option>
                </select>
              </label>
              {editMessage ? <p className="text-sm text-red-600 sm:col-span-2">{editMessage}</p> : null}
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
                >
                  {editLoading ? t.savingEdit : t.saveChanges}
                </button>
                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-lg border border-app-border px-4 py-2 text-sm text-foreground/85 hover:bg-app-accent-soft"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
          <table className="w-full min-w-[1280px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left text-app-muted">
                <th className="whitespace-nowrap px-2 py-2">{t.quoteDate}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.sku}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.unitPrice}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.taxIncluded}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.supplier}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.manufacturerCountry}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.destinationCountry}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.destinationTariff}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.seaFreightUnit}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.airFreightUnit}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.incoterm}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.by}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.at}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.edit}</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-2 py-6 text-center text-app-muted">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => (
                  <tr key={row.id} className="border-b border-app-border/60">
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{row.quoteDate}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium">{row.sku}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{row.unitPrice.toFixed(4)}</td>
                    <td className="whitespace-nowrap px-2 py-2">{row.taxIncluded ? t.yes : t.no}</td>
                    <td className="max-w-[10rem] truncate px-2 py-2">{row.supplierName}</td>
                    <td className="max-w-[8rem] truncate px-2 py-2">{row.manufacturerCountry || t.na}</td>
                    <td className="max-w-[10rem] truncate px-2 py-2">
                      {row.destinationCountry.trim()
                        ? forecastDestinationDisplay(row.destinationCountry, language, destinationOptions)
                        : t.na}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                      {fmtPct(row.destinationTariffPct, t.na)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                      {fmtUsd(row.seaFreightUnitPrice, t.na)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                      {fmtUsd(row.airFreightUnitPrice, t.na)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium">{row.incoterm}</td>
                    <td className="whitespace-nowrap px-2 py-2">{row.createdBy}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-app-muted">
                      {row.createdAt.slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="rounded-md border border-app-border px-2 py-1 text-xs font-medium text-app-accent hover:bg-app-accent-soft"
                      >
                        {t.edit}
                      </button>
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
