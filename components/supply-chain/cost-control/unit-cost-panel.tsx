"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  ccDate,
  ccInputSm,
  ccLabel,
  ccNum,
  ccSelectMd,
  ccSelectSm,
} from "@/components/shared/field-controls";
import { TableCellLongText } from "@/components/shared/table-cell-long-text";
import { usdBasisFromDomesticCnyUnit } from "@/lib/contract-domestic-pricing";
import type { Language } from "@/lib/i18n";
import { supplierNamesFuzzyMatch } from "@/lib/supplier-name-lookup";
import type { ProductItem, SupplierEntry, UnitCostQuoteEntry } from "@/lib/types";

type HistoryFilterDimension = "" | "sku" | "supplier";

type Props = {
  language: Language;
  initialEntries: UnitCostQuoteEntry[];
  products: ProductItem[];
  suppliers: SupplierEntry[];
};

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
    unitPriceCny: en ? "Unit price (CNY, tax incl.)" : "单价 (CNY 含税)",
    domesticQuoteHint: en
      ? "Domestic-contract supplier: enter the supplier's tax-included CNY price. USD for reports is derived (÷1.13÷7)."
      : "国内合同供应商：请录入供应商认可的人民币含税原价；报表用 USD 自动换算（÷1.13÷7）。",
    derivedUsd: en ? "≈ USD (reports)" : "≈ USD（报表用）",
    taxIncluded: en ? "Tax included" : "是否含税",
    supplier: en ? "Supplier name" : "供应商名称",
    quoteDate: en ? "Quote date" : "报价日期",
    save: en ? "Save quotation" : "保存报价",
    saving: en ? "Saving…" : "保存中…",
    empty: en ? "No quotations yet." : "暂无报价记录。",
    filterBy: en ? "Filter by" : "筛选",
    filterAll: en ? "All" : "全部",
    filterDimSku: "SKU",
    filterDimSupplier: en ? "Supplier name" : "供应商名称",
    filterValueAll: en ? "All" : "全部",
    yes: en ? "Yes" : "是",
    no: en ? "No" : "否",
    by: en ? "By" : "录入人",
    at: en ? "Recorded at" : "录入时间",
    reason: en ? "Reason" : "理由",
    duplicateSku: en
      ? "This SKU already has a unit cost quote. Add a reason before saving another quote."
      : "该 SKU 已存在 Unit Cost 报价。如需再次创建，请填写原因。",
    checkingSku: en ? "Checking SKU…" : "正在检查 SKU…",
    duplicateReason: en ? "Reason for creating another unit cost" : "创建重复 SKU 单价的理由",
    duplicateReasonPlaceholder: en
      ? "Example: supplier updated price, new effective date, tax condition changed..."
      : "例如：供应商调价、新生效日期、税费条件变化等",
    manufacturerCountry: en ? "Manufacturer country" : "生产商国家",
    selectMfrCountry: en ? "Select country…" : "选择国家…",
    hint: en
      ? "Supplier names match Supply Chain → Suppliers (active). Forecast destination is set on Forecast Input. Tariff, freight, and shipping for landed cost are edited on Logistics → Landed cost consolidate; use Save next to Landed cost (USD) to publish a line to Cost control → Cash flow analysis."
      : "供应商名称与「供应链 → 供应商」中启用供应商一致。Forecast 目的国在 Forecast 填报中维护；到岸相关关税、运费、运输方式在「物流进度 → 到岸成本汇总」编辑，并在「到岸成本 (USD)」右侧点击「保存」以发布到「成本控制 → 现金流分析」。",
    edit: en ? "Edit" : "编辑",
    editTitle: en ? "Edit quotation" : "编辑报价",
    cancel: en ? "Cancel" : "取消",
    saveChanges: en ? "Save changes" : "保存修改",
    savingEdit: en ? "Saving…" : "保存中…",
    delete: en ? "Delete" : "删除",
    deleteTitle: en ? "Delete quotation" : "删除报价",
    deleteReasonLabel: en ? "Deletion reason" : "删除原因",
    deleteReasonPlaceholder: en ? "Explain why this quotation is being removed…" : "请填写删除原因…",
    deleteConfirm: en ? "Confirm delete" : "确认删除",
    deleting: en ? "Deleting…" : "删除中…",
    deleteReasonRequired: en ? "Deletion reason is required." : "请填写删除原因。",
    viewFullReason: en ? "View full" : "查看全文",
    reasonDetailTitle: en ? "Quotation reason" : "报价理由",
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

  const domesticSupplierNames = useMemo(() => {
    const set = new Set<string>();
    for (const s of suppliers) {
      if (s.isDomesticContract && s.name.trim()) set.add(s.name.trim().toLowerCase());
    }
    return set;
  }, [suppliers]);

  const isDomesticSupplier = (name: string) => domesticSupplierNames.has(name.trim().toLowerCase());

  const historySupplierOptions = useMemo(() => {
    const set = new Set(activeSupplierNames);
    for (const e of initialEntries) {
      if (e.supplierName?.trim()) set.add(e.supplierName.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [activeSupplierNames, initialEntries]);

  const [sku, setSku] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [taxIncluded, setTaxIncluded] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [manufacturerCountry, setManufacturerCountry] = useState("");
  const [creationReason, setCreationReason] = useState("");
  const [remoteDuplicateSku, setRemoteDuplicateSku] = useState<boolean | null>(null);
  const [checkingDuplicateSku, setCheckingDuplicateSku] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyFilterDim, setHistoryFilterDim] = useState<HistoryFilterDimension>("");
  const [historyFilterValue, setHistoryFilterValue] = useState("");

  const [editRow, setEditRow] = useState<UnitCostQuoteEntry | null>(null);
  const [eSku, setEsku] = useState("");
  const [eUnitPrice, setEUnitPrice] = useState("");
  const [eTaxIncluded, setETaxIncluded] = useState(false);
  const [eSupplierName, setESupplierName] = useState("");
  const [eQuoteDate, setEQuoteDate] = useState("");
  const [eManufacturerCountry, setEManufacturerCountry] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [deleteRow, setDeleteRow] = useState<UnitCostQuoteEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  const supplierOptionsForEdit = useMemo(() => {
    const set = new Set(activeSupplierNames);
    if (editRow?.supplierName.trim()) set.add(editRow.supplierName.trim());
    if (eSupplierName.trim()) set.add(eSupplierName.trim());
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [activeSupplierNames, editRow, eSupplierName]);

  const normalizedSku = sku.trim().toLowerCase();
  const localDuplicateSku = useMemo(() => {
    if (!normalizedSku) return false;
    return initialEntries.some((entry) => entry.sku.trim().toLowerCase() === normalizedSku);
  }, [initialEntries, normalizedSku]);
  const duplicateSku = localDuplicateSku || remoteDuplicateSku === true;

  function onSkuChange(value: string) {
    setSku(value);
    setRemoteDuplicateSku(null);
    if (!value.trim()) setCreationReason("");
  }

  function openEdit(row: UnitCostQuoteEntry) {
    setEditRow(row);
    setEsku(row.sku);
    // Domestic suppliers edit in CNY: prefill the CNY original, or blank for legacy USD quotes
    // so a USD figure is never silently re-saved as CNY.
    if (isDomesticSupplier(row.supplierName)) {
      setEUnitPrice(row.quoteCurrency === "CNY" && row.unitPriceCny != null ? String(row.unitPriceCny) : "");
    } else {
      setEUnitPrice(String(row.unitPrice));
    }
    setETaxIncluded(row.taxIncluded);
    setESupplierName(row.supplierName);
    setEQuoteDate(row.quoteDate);
    setEManufacturerCountry(row.manufacturerCountry);
  }

  function closeEdit() {
    setEditRow(null);
  }

  function openDelete(row: UnitCostQuoteEntry) {
    closeEdit();
    setDeleteRow(row);
    setDeleteReason("");
  }

  function closeDelete() {
    setDeleteRow(null);
    setDeleteReason("");
  }

  async function onConfirmDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!deleteRow) return;
    const reason = deleteReason.trim();
    if (!reason) {
      toast.error(t.deleteReasonRequired);
      return;
    }
    setDeleteLoading(true);
    const res = await fetch(`/api/cost-control/unit-cost/${deleteRow.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setDeleteLoading(false);
    if (!res.ok) {
      toast.error(data.message || (en ? "Delete failed." : "删除失败。"));
      return;
    }
    toast.success(
      en
        ? `Quotation deleted: ${deleteRow.sku} · ${deleteRow.supplierName}`
        : `已删除报价：${deleteRow.sku} · ${deleteRow.supplierName}`,
    );
    closeDelete();
    router.refresh();
  }

  async function onSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editRow) return;
    setEditLoading(true);
    const up = Number(eUnitPrice);
    if (!eSku.trim()) {
      toast.error(en ? "SKU is required." : "请填写 SKU。");
      setEditLoading(false);
      return;
    }
    if (!Number.isFinite(up) || up < 0) {
      toast.error(en ? "Invalid unit price." : "单价无效。");
      setEditLoading(false);
      return;
    }
    if (!eSupplierName.trim()) {
      toast.error(en ? "Supplier is required." : "请选择供应商。");
      setEditLoading(false);
      return;
    }
    const res = await fetch(`/api/cost-control/unit-cost/${editRow.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: eSku.trim(),
        quoteCurrency: isDomesticSupplier(eSupplierName) ? "CNY" : "USD",
        unitPrice: up,
        unitPriceCny: isDomesticSupplier(eSupplierName) ? up : null,
        taxIncluded: eTaxIncluded,
        supplierName: eSupplierName.trim(),
        quoteDate: eQuoteDate.trim(),
        manufacturerCountry: eManufacturerCountry.trim(),
        destinationCountry: editRow.destinationCountry.trim(),
        destinationTariffPct: editRow.destinationTariffPct,
        seaFreightUnitPrice: editRow.seaFreightUnitPrice,
        airFreightUnitPrice: editRow.airFreightUnitPrice,
        incoterm: editRow.incoterm,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setEditLoading(false);
    if (!res.ok) {
      toast.error(data.message || (en ? "Save failed." : "保存失败。"));
      return;
    }
    const editPriceText = isDomesticSupplier(eSupplierName) ? `¥${up}` : `$${up}`;
    toast.success(
      en
        ? `Changes saved: ${eSku.trim()} ${editPriceText} · ${eSupplierName.trim()}`
        : `修改已保存：${eSku.trim()} ${editPriceText} · ${eSupplierName.trim()}`,
    );
    closeEdit();
    router.refresh();
  }

  const filteredHistory = useMemo(() => {
    if (!historyFilterDim || !historyFilterValue.trim()) return initialEntries;
    const v = historyFilterValue.trim();
    if (historyFilterDim === "sku") {
      return initialEntries.filter((e) => e.sku.trim() === v);
    }
    return initialEntries.filter((e) => supplierNamesFuzzyMatch(e.supplierName, v));
  }, [initialEntries, historyFilterDim, historyFilterValue]);

  function onHistoryFilterDimChange(dim: HistoryFilterDimension) {
    setHistoryFilterDim(dim);
    setHistoryFilterValue("");
  }

  async function checkSkuDuplicate(skuValue = sku.trim()): Promise<boolean> {
    const value = skuValue.trim();
    if (!value) {
      setRemoteDuplicateSku(null);
      return false;
    }
    if (localDuplicateSku) {
      setRemoteDuplicateSku(true);
      return true;
    }

    setCheckingDuplicateSku(true);
    try {
      const res = await fetch(`/api/cost-control/unit-cost?sku=${encodeURIComponent(value)}`);
      const data = (await res.json().catch(() => ({}))) as { exists?: boolean };
      const exists = res.ok && data.exists === true;
      setRemoteDuplicateSku(exists);
      return exists;
    } catch {
      setRemoteDuplicateSku(null);
      return false;
    } finally {
      setCheckingDuplicateSku(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const up = Number(unitPrice);
    if (!sku.trim()) {
      toast.error(en ? "SKU is required." : "请填写 SKU。");
      setLoading(false);
      return;
    }
    if (!Number.isFinite(up) || up < 0) {
      toast.error(en ? "Invalid unit price." : "单价无效。");
      setLoading(false);
      return;
    }
    if (!supplierName.trim()) {
      toast.error(en ? "Supplier is required." : "请选择供应商。");
      setLoading(false);
      return;
    }
    const skuExists = duplicateSku || (await checkSkuDuplicate(sku.trim()));
    if (skuExists && !creationReason.trim()) {
      toast.error(en ? "Reason is required for duplicate SKU." : "SKU 已存在，请填写创建单价的理由。");
      setLoading(false);
      return;
    }
    const res = await fetch("/api/cost-control/unit-cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: sku.trim(),
        quoteCurrency: isDomesticSupplier(supplierName) ? "CNY" : "USD",
        unitPrice: up,
        unitPriceCny: isDomesticSupplier(supplierName) ? up : null,
        taxIncluded,
        supplierName: supplierName.trim(),
        quoteDate: quoteDate.trim(),
        manufacturerCountry: manufacturerCountry.trim(),
        destinationCountry: "",
        destinationTariffPct: null,
        seaFreightUnitPrice: null,
        airFreightUnitPrice: null,
        incoterm: "EXW",
        creationReason: skuExists ? creationReason.trim() : "",
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      toast.error(data.message || (en ? "Save failed." : "保存失败。"));
      return;
    }
    const savedPriceText = isDomesticSupplier(supplierName) ? `¥${up}` : `$${up}`;
    toast.success(
      en
        ? `Quotation saved: ${sku.trim()} ${savedPriceText} · ${supplierName.trim()}`
        : `报价已保存：${sku.trim()} ${savedPriceText} · ${supplierName.trim()}`,
    );
    setUnitPrice("");
    setManufacturerCountry("");
    setCreationReason("");
    router.refresh();
  }

  const skuInputClass = duplicateSku
    ? `${ccInputSm} border-amber-300 bg-amber-50/60`
    : `${ccInputSm} border-app-border`;

  const createCnyMode = isDomesticSupplier(supplierName);
  const createDerivedUsd = createCnyMode ? usdBasisFromDomesticCnyUnit(Number(unitPrice)) : null;
  const editCnyMode = isDomesticSupplier(eSupplierName);
  const editDerivedUsd = editCnyMode ? usdBasisFromDomesticCnyUnit(Number(eUnitPrice)) : null;

  return (
    <div className="space-y-8">
      <details className="text-xs text-app-muted">
        <summary className="cursor-pointer select-none font-medium text-foreground/80">
          {en ? "Unit cost & landed cost workflow" : "单位成本与到岸成本说明"}
        </summary>
        <p className="mt-1 max-w-3xl leading-relaxed">{t.hint}</p>
      </details>

      <section>
        <h3 className="mb-3 text-base font-semibold text-foreground">{t.title}</h3>
        <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-x-3 gap-y-2">
          <label className="shrink-0">
            <span className={ccLabel}>{t.sku}</span>
            <input
              list="unit-cost-sku-options"
              value={sku}
              onChange={(e) => onSkuChange(e.target.value)}
              onBlur={() => {
                void checkSkuDuplicate();
              }}
              required
              aria-describedby={duplicateSku || checkingDuplicateSku ? "unit-cost-duplicate-sku-hint" : undefined}
              className={skuInputClass}
              placeholder={en ? "e.g. IGB4E" : "例如 IGB4E"}
            />
            <datalist id="unit-cost-sku-options">
              {skuOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {duplicateSku ? (
              <p id="unit-cost-duplicate-sku-hint" className="mt-1 text-xs font-medium text-amber-700">
                {t.duplicateSku}
              </p>
            ) : checkingDuplicateSku ? (
              <p id="unit-cost-duplicate-sku-hint" className="mt-1 text-xs text-app-muted">
                {t.checkingSku}
              </p>
            ) : null}
          </label>
          {duplicateSku ? (
            <label className="min-w-0 w-full shrink-0 basis-full">
              <span className={ccLabel}>{t.duplicateReason}</span>
              <textarea
                value={creationReason}
                onChange={(e) => setCreationReason(e.target.value)}
                required={duplicateSku}
                maxLength={500}
                rows={2}
                className="mt-0 w-full min-w-0 max-w-xl rounded-lg border border-app-border px-2 py-1.5 text-sm"
                placeholder={t.duplicateReasonPlaceholder}
              />
            </label>
          ) : null}
          <label className="shrink-0">
            <span className={ccLabel}>{createCnyMode ? t.unitPriceCny : t.unitPrice}</span>
            <input
              type="number"
              min={0}
              step="0.0001"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              required
              className={ccNum}
              title={createCnyMode ? t.domesticQuoteHint : undefined}
            />
            {createCnyMode && createDerivedUsd != null && createDerivedUsd > 0 ? (
              <p className="mt-1 text-xs tabular-nums text-app-muted">
                {t.derivedUsd}: ${createDerivedUsd.toFixed(4)}
              </p>
            ) : null}
          </label>
          <label className="flex shrink-0 items-end gap-2 pb-1">
            <input
              type="checkbox"
              checked={createCnyMode ? true : taxIncluded}
              disabled={createCnyMode}
              onChange={(e) => setTaxIncluded(e.target.checked)}
              className="h-4 w-4 rounded border-app-border"
            />
            <span className="text-xs text-foreground/85">{t.taxIncluded}</span>
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{t.supplier}</span>
            <select
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              required
              className={ccSelectMd}
            >
              <option value="">{en ? "Select supplier…" : "选择供应商…"}</option>
              {activeSupplierNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{t.quoteDate}</span>
            <input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              required
              className={ccDate}
            />
          </label>
          <label className="shrink-0">
            <span className={ccLabel}>{t.manufacturerCountry}</span>
            <select
              value={manufacturerCountry}
              onChange={(e) => setManufacturerCountry(e.target.value)}
              className={ccSelectMd}
            >
              <option value="">{t.selectMfrCountry}</option>
              {manufacturerCountrySelectOptions(manufacturerCountry).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
          >
            {loading ? t.saving : t.save}
          </button>
        </form>
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
            <form onSubmit={onSaveEdit} className="flex flex-wrap items-end gap-x-3 gap-y-2">
              <label className="shrink-0">
                <span className={ccLabel}>{t.sku}</span>
                <input
                  list="unit-cost-sku-options-edit"
                  value={eSku}
                  onChange={(ev) => setEsku(ev.target.value)}
                  required
                  className={ccInputSm}
                />
                <datalist id="unit-cost-sku-options-edit">
                  {skuOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </label>
              <label className="shrink-0">
                <span className={ccLabel}>{editCnyMode ? t.unitPriceCny : t.unitPrice}</span>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={eUnitPrice}
                  onChange={(ev) => setEUnitPrice(ev.target.value)}
                  required
                  className={ccNum}
                  title={editCnyMode ? t.domesticQuoteHint : undefined}
                />
                {editCnyMode && editDerivedUsd != null && editDerivedUsd > 0 ? (
                  <p className="mt-1 text-xs tabular-nums text-app-muted">
                    {t.derivedUsd}: ${editDerivedUsd.toFixed(4)}
                  </p>
                ) : null}
              </label>
              <label className="flex shrink-0 items-end gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={editCnyMode ? true : eTaxIncluded}
                  disabled={editCnyMode}
                  onChange={(ev) => setETaxIncluded(ev.target.checked)}
                  className="h-4 w-4 rounded border-app-border"
                />
                <span className="text-xs text-foreground/85">{t.taxIncluded}</span>
              </label>
              <label className="shrink-0">
                <span className={ccLabel}>{t.supplier}</span>
                <select
                  value={eSupplierName}
                  onChange={(ev) => setESupplierName(ev.target.value)}
                  required
                  className={ccSelectMd}
                >
                  <option value="">{en ? "Select supplier…" : "选择供应商…"}</option>
                  {supplierOptionsForEdit.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="shrink-0">
                <span className={ccLabel}>{t.quoteDate}</span>
                <input
                  type="date"
                  value={eQuoteDate}
                  onChange={(ev) => setEQuoteDate(ev.target.value)}
                  required
                  className={ccDate}
                />
              </label>
              <label className="shrink-0">
                <span className={ccLabel}>{t.manufacturerCountry}</span>
                <select
                  value={eManufacturerCountry}
                  onChange={(ev) => setEManufacturerCountry(ev.target.value)}
                  className={ccSelectMd}
                >
                  <option value="">{t.selectMfrCountry}</option>
                  {manufacturerCountrySelectOptions(eManufacturerCountry).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex w-full shrink-0 basis-full flex-wrap gap-2">
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

      {deleteRow ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal
          aria-labelledby="unit-cost-delete-title"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget && !deleteLoading) closeDelete();
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 id="unit-cost-delete-title" className="text-base font-semibold text-foreground">
                {t.deleteTitle}
              </h3>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={closeDelete}
                className="rounded-lg border border-app-border px-2.5 py-1 text-sm text-foreground/80 hover:bg-app-accent-soft disabled:opacity-50"
              >
                {t.cancel}
              </button>
            </div>
            <p className="mb-3 text-sm text-app-muted">
              {deleteRow.sku} · {deleteRow.quoteDate} · {deleteRow.supplierName}
            </p>
            <form onSubmit={onConfirmDelete} className="space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-foreground/85">{t.deleteReasonLabel}</span>
                <textarea
                  value={deleteReason}
                  onChange={(ev) => setDeleteReason(ev.target.value)}
                  required
                  rows={3}
                  className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                  placeholder={t.deleteReasonPlaceholder}
                  autoFocus
                />
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <button
                  type="submit"
                  disabled={deleteLoading}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading ? t.deleting : t.deleteConfirm}
                </button>
                <button
                  type="button"
                  disabled={deleteLoading}
                  onClick={closeDelete}
                  className="rounded-lg border border-app-border px-4 py-2 text-sm text-foreground/85 hover:bg-app-accent-soft disabled:opacity-50"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section>
        <div className="mb-3 flex flex-wrap items-end gap-x-3 gap-y-2">
          <h3 className="shrink-0 text-base font-semibold text-foreground">{t.history}</h3>
          <div className="flex shrink-0 flex-wrap items-end gap-2">
            <label className="flex items-end gap-2">
              <span className={ccLabel}>{t.filterBy}</span>
              <select
                value={historyFilterDim}
                onChange={(e) => onHistoryFilterDimChange(e.target.value as HistoryFilterDimension)}
                className={ccSelectSm}
                aria-label={t.filterBy}
              >
                <option value="">{t.filterAll}</option>
                <option value="sku">{t.filterDimSku}</option>
                <option value="supplier">{t.filterDimSupplier}</option>
              </select>
            </label>
            {historyFilterDim ? (
              <label className="flex items-end gap-2">
                <span className="sr-only">
                  {historyFilterDim === "sku" ? t.filterDimSku : t.filterDimSupplier}
                </span>
                <select
                  value={historyFilterValue}
                  onChange={(e) => setHistoryFilterValue(e.target.value)}
                  className={ccSelectSm}
                  aria-label={
                    historyFilterDim === "sku"
                      ? en
                        ? "SKU filter value"
                        : "SKU 筛选值"
                      : en
                        ? "Supplier filter value"
                        : "供应商筛选值"
                  }
                >
                  <option value="">{t.filterValueAll}</option>
                  {historyFilterDim === "sku"
                    ? skuOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))
                    : historySupplierOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                </select>
              </label>
            ) : null}
          </div>
        </div>
        <div className="app-table-shell overflow-x-auto">
          <table className="w-full min-w-[840px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left text-app-muted">
                <th className="whitespace-nowrap px-2 py-2">{t.quoteDate}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.sku}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.unitPrice}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.taxIncluded}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.supplier}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.manufacturerCountry}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.reason}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.by}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.at}</th>
                <th className="whitespace-nowrap px-2 py-2">{t.edit}</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-2 py-6 text-center text-app-muted">
                    {t.empty}
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row) => (
                  <tr key={row.id} className="border-b border-app-border/60">
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">{row.quoteDate}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-medium">{row.sku}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums">
                      {row.quoteCurrency === "CNY" && row.unitPriceCny != null ? (
                        <span title={t.domesticQuoteHint}>
                          ¥{row.unitPriceCny.toFixed(4)}
                          <span className="ml-1 text-xs text-app-muted">(${row.unitPrice.toFixed(4)})</span>
                        </span>
                      ) : (
                        row.unitPrice.toFixed(4)
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{row.taxIncluded ? t.yes : t.no}</td>
                    <td className="max-w-[10rem] truncate px-2 py-2">{row.supplierName}</td>
                    <td className="max-w-[8rem] truncate px-2 py-2">{row.manufacturerCountry || "—"}</td>
                    <td className="px-2 py-2 align-top">
                      <TableCellLongText
                        text={row.creationReason}
                        viewLabel={t.viewFullReason}
                        dialogTitle={t.reasonDetailTitle}
                        closeLabel={t.cancel}
                      />
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">{row.createdBy}</td>
                    <td className="whitespace-nowrap px-2 py-2 tabular-nums text-app-muted">
                      {row.createdAt.slice(0, 19).replace("T", " ")}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="rounded-md border border-app-border px-2 py-1 text-xs font-medium text-app-accent hover:bg-app-accent-soft"
                        >
                          {t.edit}
                        </button>
                        <button
                          type="button"
                          onClick={() => openDelete(row)}
                          className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70"
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
