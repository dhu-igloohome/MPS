"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import { INVENTORY_GLOBAL_MAIN_SKU_OPTIONS } from "@/lib/inventory-global-main-skus";
import type { InventoryGlobalEntry } from "@/lib/types";

type Props = { entries: InventoryGlobalEntry[]; language: Language };

type Form = Omit<InventoryGlobalEntry, "id" | "createdBy" | "createdAt" | "updatedAt">;

function numStr(n: number): string {
  return n === 0 ? "" : String(n);
}

const DEFAULT_FORM: Form = {
  mainSku: INVENTORY_GLOBAL_MAIN_SKU_OPTIONS[0],
  variantSku: "",
  batch: "",
  batchNoSn: "",
  goodToReleaseShipmentFromCm: 0,
  status: "",
  description: "",
  stockQtyAvailableForFulfillment: 0,
  reservedQty: 0,
  batchesBalanceQty: 0,
  mpBatchProducedQty: 0,
  dkksFactory: 0,
  huiliFactory: 0,
  bolanFactory: 0,
  jiadunFactory: 0,
  jinjianFactory: 0,
  huameiFactory: 0,
  shenzhenOffice: 0,
  taiwanFuhshing: 0,
  singaporeOffice: 0,
  cargohubWarehouse: 0,
  koreaSolityFactory: 0,
  vietnamSolityFactory: 0,
  aztechFactory: 0,
  swrFactory: 0,
  vsFactory: 0,
  ibeFactory: 0,
  smartWarehousing: 0,
  omniWarehouse: 0,
  amazonFba: 0,
  safetyStockAtAmazon: 0,
  jdmWarehouse: 0,
  amazon: 0,
  syw: 0,
  inTransitStock: 0,
  inventoryReceivedDate: null,
  agingDaysC: 0,
  unitPriceRmb: 0,
  unitPriceUsd: 0,
  batchesInventoryCostUsd: 0,
  skuInventoryCostUsd: 0,
  chinaInventoryCostUsd: 0,
  singaporeInventoryCostUsd: 0,
  singaporeCargohubInventoryCostUsd: 0,
  koreaSolityInventoryCost: 0,
  vietnamSolityInventoryCostUsd: 0,
  usaOmniInventoryVostUsd: 0,
  usAmazonFba: 0,
  europeJdmInventoryCostUsd: 0,
  inTransitInventoryCostUsd: 0,
};

/** Form state uses strings for numeric inputs (empty → 0). */
type FormStrings = Record<
  keyof Omit<Form, "mainSku">,
  string
> & { mainSku: string };

function formToStrings(f: Form): FormStrings {
  const o = {} as FormStrings;
  (Object.keys(f) as (keyof Form)[]).forEach((k) => {
    const v = f[k];
    if (k === "mainSku") (o as { mainSku: string }).mainSku = String(v);
    else if (k === "inventoryReceivedDate")
      o.inventoryReceivedDate = v == null ? "" : String(v);
    else if (typeof v === "number") o[k as keyof FormStrings] = numStr(v);
    else o[k as keyof FormStrings] = String(v ?? "");
  });
  return o;
}

function stringsToForm(s: FormStrings): Form {
  const parseInt0 = (t: string) => {
    const x = t.trim();
    if (x === "") return 0;
    const n = Number(x);
    return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : NaN;
  };
  const parseMoney = (t: string) => {
    const x = t.trim();
    if (x === "") return 0;
    const n = Number(x);
    return Number.isFinite(n) && n >= 0 ? n : NaN;
  };
  return {
    mainSku: s.mainSku,
    variantSku: s.variantSku,
    batch: s.batch,
    batchNoSn: s.batchNoSn,
    goodToReleaseShipmentFromCm: parseInt0(s.goodToReleaseShipmentFromCm),
    status: s.status,
    description: s.description,
    stockQtyAvailableForFulfillment: parseInt0(s.stockQtyAvailableForFulfillment),
    reservedQty: parseInt0(s.reservedQty),
    batchesBalanceQty: parseInt0(s.batchesBalanceQty),
    mpBatchProducedQty: parseInt0(s.mpBatchProducedQty),
    dkksFactory: parseInt0(s.dkksFactory),
    huiliFactory: parseInt0(s.huiliFactory),
    bolanFactory: parseInt0(s.bolanFactory),
    jiadunFactory: parseInt0(s.jiadunFactory),
    jinjianFactory: parseInt0(s.jinjianFactory),
    huameiFactory: parseInt0(s.huameiFactory),
    shenzhenOffice: parseInt0(s.shenzhenOffice),
    taiwanFuhshing: parseInt0(s.taiwanFuhshing),
    singaporeOffice: parseInt0(s.singaporeOffice),
    cargohubWarehouse: parseInt0(s.cargohubWarehouse),
    koreaSolityFactory: parseInt0(s.koreaSolityFactory),
    vietnamSolityFactory: parseInt0(s.vietnamSolityFactory),
    aztechFactory: parseInt0(s.aztechFactory),
    swrFactory: parseInt0(s.swrFactory),
    vsFactory: parseInt0(s.vsFactory),
    ibeFactory: parseInt0(s.ibeFactory),
    smartWarehousing: parseInt0(s.smartWarehousing),
    omniWarehouse: parseInt0(s.omniWarehouse),
    amazonFba: parseInt0(s.amazonFba),
    safetyStockAtAmazon: parseInt0(s.safetyStockAtAmazon),
    jdmWarehouse: parseInt0(s.jdmWarehouse),
    amazon: parseInt0(s.amazon),
    syw: parseInt0(s.syw),
    inTransitStock: parseInt0(s.inTransitStock),
    inventoryReceivedDate: s.inventoryReceivedDate.trim() || null,
    agingDaysC: parseInt0(s.agingDaysC),
    unitPriceRmb: parseMoney(s.unitPriceRmb),
    unitPriceUsd: parseMoney(s.unitPriceUsd),
    batchesInventoryCostUsd: parseMoney(s.batchesInventoryCostUsd),
    skuInventoryCostUsd: parseMoney(s.skuInventoryCostUsd),
    chinaInventoryCostUsd: parseMoney(s.chinaInventoryCostUsd),
    singaporeInventoryCostUsd: parseMoney(s.singaporeInventoryCostUsd),
    singaporeCargohubInventoryCostUsd: parseMoney(s.singaporeCargohubInventoryCostUsd),
    koreaSolityInventoryCost: parseMoney(s.koreaSolityInventoryCost),
    vietnamSolityInventoryCostUsd: parseMoney(s.vietnamSolityInventoryCostUsd),
    usaOmniInventoryVostUsd: parseMoney(s.usaOmniInventoryVostUsd),
    usAmazonFba: parseMoney(s.usAmazonFba),
    europeJdmInventoryCostUsd: parseMoney(s.europeJdmInventoryCostUsd),
    inTransitInventoryCostUsd: parseMoney(s.inTransitInventoryCostUsd),
  };
}

function entryToFormStrings(e: InventoryGlobalEntry): FormStrings {
  return formToStrings({
    mainSku: e.mainSku,
    variantSku: e.variantSku,
    batch: e.batch,
    batchNoSn: e.batchNoSn,
    goodToReleaseShipmentFromCm: e.goodToReleaseShipmentFromCm,
    status: e.status,
    description: e.description,
    stockQtyAvailableForFulfillment: e.stockQtyAvailableForFulfillment,
    reservedQty: e.reservedQty,
    batchesBalanceQty: e.batchesBalanceQty,
    mpBatchProducedQty: e.mpBatchProducedQty,
    dkksFactory: e.dkksFactory,
    huiliFactory: e.huiliFactory,
    bolanFactory: e.bolanFactory,
    jiadunFactory: e.jiadunFactory,
    jinjianFactory: e.jinjianFactory,
    huameiFactory: e.huameiFactory,
    shenzhenOffice: e.shenzhenOffice,
    taiwanFuhshing: e.taiwanFuhshing,
    singaporeOffice: e.singaporeOffice,
    cargohubWarehouse: e.cargohubWarehouse,
    koreaSolityFactory: e.koreaSolityFactory,
    vietnamSolityFactory: e.vietnamSolityFactory,
    aztechFactory: e.aztechFactory,
    swrFactory: e.swrFactory,
    vsFactory: e.vsFactory,
    ibeFactory: e.ibeFactory,
    smartWarehousing: e.smartWarehousing,
    omniWarehouse: e.omniWarehouse,
    amazonFba: e.amazonFba,
    safetyStockAtAmazon: e.safetyStockAtAmazon,
    jdmWarehouse: e.jdmWarehouse,
    amazon: e.amazon,
    syw: e.syw,
    inTransitStock: e.inTransitStock,
    inventoryReceivedDate: e.inventoryReceivedDate,
    agingDaysC: e.agingDaysC,
    unitPriceRmb: e.unitPriceRmb,
    unitPriceUsd: e.unitPriceUsd,
    batchesInventoryCostUsd: e.batchesInventoryCostUsd,
    skuInventoryCostUsd: e.skuInventoryCostUsd,
    chinaInventoryCostUsd: e.chinaInventoryCostUsd,
    singaporeInventoryCostUsd: e.singaporeInventoryCostUsd,
    singaporeCargohubInventoryCostUsd: e.singaporeCargohubInventoryCostUsd,
    koreaSolityInventoryCost: e.koreaSolityInventoryCost,
    vietnamSolityInventoryCostUsd: e.vietnamSolityInventoryCostUsd,
    usaOmniInventoryVostUsd: e.usaOmniInventoryVostUsd,
    usAmazonFba: e.usAmazonFba,
    europeJdmInventoryCostUsd: e.europeJdmInventoryCostUsd,
    inTransitInventoryCostUsd: e.inTransitInventoryCostUsd,
  });
}

export function InventoryGlobalPanel({ entries, language }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormStrings>(() => formToStrings(DEFAULT_FORM));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const en = language === "en";

  const columns = useMemo(
    () => [
      "Main SKU",
      "Variant SKU",
      "Batch",
      "Batch No. (S/N)",
      "Good to Release Shipment from CM",
      "Status",
      "Description",
      "Stock Qty Available for Fulfillment",
      "Reserved Qty",
      "Batches Balance Qty",
      "MP Batch Produced Qty",
      "DKKS Factory",
      "Huili Factory",
      "Bolan Factory",
      "Jiadun Factory",
      "Jinjian Factory",
      "Huamei Factory",
      "Shenzhen Office",
      "Taiwan Fuhshing",
      "Singapore Office",
      "Cargohub Warehouse",
      "Korea Solity Factory",
      "Vietnam Solity Factory",
      "Aztech Factory",
      "SWR Factory",
      "VS Factory",
      "IBE Factory",
      "Smart Warehousing",
      "Omni Warehouse",
      "Amazon FBA",
      "Safety Stock at Amazon",
      "JDM Warehouse",
      "Amazon",
      "SYW",
      "In Transit Stock",
      "Inventory Received Date",
      "Aging Days (C)",
      "Unit price (RMB)",
      "Unit price (USD)",
      "Batches Inventory Cost (USD)",
      "SKU Inventory Cost (USD)",
      "China Inventory Cost (USD)",
      "Singapore Inventory Cost (USD)",
      "Singapore Cargohub Inv. Cost (USD)",
      "Korea Solity Inventory Cost",
      "Vietnam Solity Inv. Cost (USD)",
      "USA Omni Inventory Cost (USD)",
      "US Amazon FBA",
      "Europe JDM Inv. Cost (USD)",
      "In Transit Inv. Cost (USD)",
      "Created by",
    ],
    [],
  );

  function resetForm() {
    setEditingId(null);
    setForm(formToStrings(DEFAULT_FORM));
    setMessage("");
  }

  function startEdit(e: InventoryGlobalEntry) {
    setEditingId(e.id);
    setForm(entryToFormStrings(e));
    setMessage("");
  }

  function setField<K extends keyof FormStrings>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const parsed = stringsToForm(form);
    const nums = [
      parsed.goodToReleaseShipmentFromCm,
      parsed.stockQtyAvailableForFulfillment,
      parsed.reservedQty,
      parsed.batchesBalanceQty,
      parsed.mpBatchProducedQty,
      parsed.dkksFactory,
      parsed.huiliFactory,
      parsed.bolanFactory,
      parsed.jiadunFactory,
      parsed.jinjianFactory,
      parsed.huameiFactory,
      parsed.shenzhenOffice,
      parsed.taiwanFuhshing,
      parsed.singaporeOffice,
      parsed.cargohubWarehouse,
      parsed.koreaSolityFactory,
      parsed.vietnamSolityFactory,
      parsed.aztechFactory,
      parsed.swrFactory,
      parsed.vsFactory,
      parsed.ibeFactory,
      parsed.smartWarehousing,
      parsed.omniWarehouse,
      parsed.amazonFba,
      parsed.safetyStockAtAmazon,
      parsed.jdmWarehouse,
      parsed.amazon,
      parsed.syw,
      parsed.inTransitStock,
      parsed.agingDaysC,
      parsed.unitPriceRmb,
      parsed.unitPriceUsd,
      parsed.batchesInventoryCostUsd,
      parsed.skuInventoryCostUsd,
      parsed.chinaInventoryCostUsd,
      parsed.singaporeInventoryCostUsd,
      parsed.singaporeCargohubInventoryCostUsd,
      parsed.koreaSolityInventoryCost,
      parsed.vietnamSolityInventoryCostUsd,
      parsed.usaOmniInventoryVostUsd,
      parsed.usAmazonFba,
      parsed.europeJdmInventoryCostUsd,
      parsed.inTransitInventoryCostUsd,
    ];
    if (nums.some((n) => Number.isNaN(n))) {
      setLoading(false);
      return setMessage(en ? "Invalid numeric fields" : "数值字段不合法");
    }
    const body = { ...parsed, inventoryReceivedDate: parsed.inventoryReceivedDate };
    const response = await fetch(
      editingId
        ? `/api/logistics-inventory-global/${encodeURIComponent(editingId)}`
        : "/api/logistics-inventory-global",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!response.ok) return setMessage(data.message || "Request failed");
    resetForm();
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm(en ? "Delete this row?" : "确认删除该条记录？")) return;
    const response = await fetch(`/api/logistics-inventory-global/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) return setMessage("Delete failed");
    if (editingId === id) resetForm();
    router.refresh();
  }

  function showNum(value: number) {
    return value === 0 ? "-" : value;
  }

  const intInput = (key: keyof FormStrings, placeholder: string) => (
    <input
      type="number"
      min={0}
      className="rounded-lg border border-app-border px-3 py-2 text-sm"
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setField(key, e.target.value)}
    />
  );

  const moneyInput = (key: keyof FormStrings, placeholder: string) => (
    <input
      type="number"
      min={0}
      step="0.01"
      className="rounded-lg border border-app-border px-3 py-2 text-sm"
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setField(key, e.target.value)}
    />
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">
          {en ? "Inventory Global" : "Inventory Global"}
        </h3>
        <form className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4" onSubmit={onSubmit}>
          <select
            className="rounded-lg border border-app-border px-3 py-2 text-sm"
            value={form.mainSku}
            onChange={(e) => setField("mainSku", e.target.value)}
            required
          >
            {INVENTORY_GLOBAL_MAIN_SKU_OPTIONS.map((sku) => (
              <option key={sku} value={sku}>
                {sku}
              </option>
            ))}
          </select>
          <input
            className="rounded-lg border border-app-border px-3 py-2 text-sm"
            placeholder="Variant SKU"
            value={form.variantSku}
            onChange={(e) => setField("variantSku", e.target.value)}
          />
          <input
            className="rounded-lg border border-app-border px-3 py-2 text-sm"
            placeholder="Batch"
            value={form.batch}
            onChange={(e) => setField("batch", e.target.value)}
          />
          <input
            className="rounded-lg border border-app-border px-3 py-2 text-sm"
            placeholder="Batch No. (S/N)"
            value={form.batchNoSn}
            onChange={(e) => setField("batchNoSn", e.target.value)}
          />
          {intInput("goodToReleaseShipmentFromCm", "Good to Release Shipment from CM")}
          <input
            className="rounded-lg border border-app-border px-3 py-2 text-sm"
            placeholder="Status"
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
          />
          <input
            className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
          />
          {intInput("stockQtyAvailableForFulfillment", "Stock Qty Available for Fulfillment")}
          {intInput("reservedQty", "Reserved Qty")}
          {intInput("batchesBalanceQty", "Batches Balance Qty")}
          {intInput("mpBatchProducedQty", "MP Batch Produced Qty")}
          {intInput("dkksFactory", "DKKS Factory")}
          {intInput("huiliFactory", "Huili Factory")}
          {intInput("bolanFactory", "Bolan Factory")}
          {intInput("jiadunFactory", "Jiadun Factory")}
          {intInput("jinjianFactory", "Jinjian Factory")}
          {intInput("huameiFactory", "Huamei Factory")}
          {intInput("shenzhenOffice", "Shenzhen Office")}
          {intInput("taiwanFuhshing", "Taiwan Fuhshing")}
          {intInput("singaporeOffice", "Singapore Office")}
          {intInput("cargohubWarehouse", "Cargohub Warehouse")}
          {intInput("koreaSolityFactory", "Korea Solity Factory")}
          {intInput("vietnamSolityFactory", "Vietnam Solity Factory")}
          {intInput("aztechFactory", "Aztech Factory")}
          {intInput("swrFactory", "SWR Factory")}
          {intInput("vsFactory", "VS Factory")}
          {intInput("ibeFactory", "IBE Factory")}
          {intInput("smartWarehousing", "Smart Warehousing")}
          {intInput("omniWarehouse", "Omni Warehouse")}
          {intInput("amazonFba", "Amazon FBA")}
          {intInput("safetyStockAtAmazon", "Safety Stock at Amazon")}
          {intInput("jdmWarehouse", "JDM Warehouse")}
          {intInput("amazon", "Amazon")}
          {intInput("syw", "SYW")}
          {intInput("inTransitStock", "In Transit Stock")}
          <input
            type="date"
            className="rounded-lg border border-app-border px-3 py-2 text-sm"
            value={form.inventoryReceivedDate}
            onChange={(e) => setField("inventoryReceivedDate", e.target.value)}
          />
          {intInput("agingDaysC", "Aging Days (C)")}
          {moneyInput("unitPriceRmb", "Unit price (RMB)")}
          {moneyInput("unitPriceUsd", "Unit price (USD)")}
          {moneyInput("batchesInventoryCostUsd", "Batches Inventory Cost (USD)")}
          {moneyInput("skuInventoryCostUsd", "SKU Inventory Cost (USD)")}
          {moneyInput("chinaInventoryCostUsd", "China Inventory Cost (USD)")}
          {moneyInput("singaporeInventoryCostUsd", "Singapore Inventory Cost (USD)")}
          {moneyInput("singaporeCargohubInventoryCostUsd", "Singapore Cargohub Inv. Cost (USD)")}
          {moneyInput("koreaSolityInventoryCost", "Korea Solity Inventory Cost")}
          {moneyInput("vietnamSolityInventoryCostUsd", "Vietnam Solity Inv. Cost (USD)")}
          {moneyInput("usaOmniInventoryVostUsd", "USA Omni Inventory Cost (USD)")}
          {moneyInput("usAmazonFba", "US Amazon FBA")}
          {moneyInput("europeJdmInventoryCostUsd", "Europe JDM Inv. Cost (USD)")}
          {moneyInput("inTransitInventoryCostUsd", "In Transit Inv. Cost (USD)")}
          <div className="lg:col-span-4 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60"
            >
              {editingId ? (en ? "Save" : "保存") : en ? "Create" : "创建"}
            </button>
            {editingId ? (
              <button type="button" onClick={resetForm} className="rounded-lg border border-app-border px-4 py-2 text-sm">
                {en ? "Cancel" : "取消"}
              </button>
            ) : null}
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[7200px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border/90 text-left text-zinc-600">
                {columns.map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2">
                    {h}
                  </th>
                ))}
                <th className="px-2 py-2">{en ? "Actions" : "操作"}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-2 py-6 text-center text-app-muted">
                    {en ? "No inventory global rows yet." : "暂无 Inventory Global 数据。"}
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-b border-app-border/35">
                    <td className="whitespace-nowrap px-2 py-2">{e.mainSku}</td>
                    <td className="px-2 py-2">{e.variantSku || "-"}</td>
                    <td className="px-2 py-2">{e.batch || "-"}</td>
                    <td className="px-2 py-2">{e.batchNoSn || "-"}</td>
                    <td className="px-2 py-2">{showNum(e.goodToReleaseShipmentFromCm)}</td>
                    <td className="px-2 py-2">{e.status || "-"}</td>
                    <td className="max-w-[200px] truncate px-2 py-2" title={e.description}>
                      {e.description || "-"}
                    </td>
                    <td className="px-2 py-2">{showNum(e.stockQtyAvailableForFulfillment)}</td>
                    <td className="px-2 py-2">{showNum(e.reservedQty)}</td>
                    <td className="px-2 py-2">{showNum(e.batchesBalanceQty)}</td>
                    <td className="px-2 py-2">{showNum(e.mpBatchProducedQty)}</td>
                    <td className="px-2 py-2">{showNum(e.dkksFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.huiliFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.bolanFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.jiadunFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.jinjianFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.huameiFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.shenzhenOffice)}</td>
                    <td className="px-2 py-2">{showNum(e.taiwanFuhshing)}</td>
                    <td className="px-2 py-2">{showNum(e.singaporeOffice)}</td>
                    <td className="px-2 py-2">{showNum(e.cargohubWarehouse)}</td>
                    <td className="px-2 py-2">{showNum(e.koreaSolityFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.vietnamSolityFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.aztechFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.swrFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.vsFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.ibeFactory)}</td>
                    <td className="px-2 py-2">{showNum(e.smartWarehousing)}</td>
                    <td className="px-2 py-2">{showNum(e.omniWarehouse)}</td>
                    <td className="px-2 py-2">{showNum(e.amazonFba)}</td>
                    <td className="px-2 py-2">{showNum(e.safetyStockAtAmazon)}</td>
                    <td className="px-2 py-2">{showNum(e.jdmWarehouse)}</td>
                    <td className="px-2 py-2">{showNum(e.amazon)}</td>
                    <td className="px-2 py-2">{showNum(e.syw)}</td>
                    <td className="px-2 py-2">{showNum(e.inTransitStock)}</td>
                    <td className="px-2 py-2">{e.inventoryReceivedDate || "-"}</td>
                    <td className="px-2 py-2">{showNum(e.agingDaysC)}</td>
                    <td className="px-2 py-2">{showNum(e.unitPriceRmb)}</td>
                    <td className="px-2 py-2">{showNum(e.unitPriceUsd)}</td>
                    <td className="px-2 py-2">{showNum(e.batchesInventoryCostUsd)}</td>
                    <td className="px-2 py-2">{showNum(e.skuInventoryCostUsd)}</td>
                    <td className="px-2 py-2">{showNum(e.chinaInventoryCostUsd)}</td>
                    <td className="px-2 py-2">{showNum(e.singaporeInventoryCostUsd)}</td>
                    <td className="px-2 py-2">{showNum(e.singaporeCargohubInventoryCostUsd)}</td>
                    <td className="px-2 py-2">{showNum(e.koreaSolityInventoryCost)}</td>
                    <td className="px-2 py-2">{showNum(e.vietnamSolityInventoryCostUsd)}</td>
                    <td className="px-2 py-2">{showNum(e.usaOmniInventoryVostUsd)}</td>
                    <td className="px-2 py-2">{showNum(e.usAmazonFba)}</td>
                    <td className="px-2 py-2">{showNum(e.europeJdmInventoryCostUsd)}</td>
                    <td className="px-2 py-2">{showNum(e.inTransitInventoryCostUsd)}</td>
                    <td className="px-2 py-2">{e.createdBy || "-"}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(e)}
                          className="rounded border border-app-border px-2 py-1 text-xs"
                        >
                          {en ? "Edit" : "编辑"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(e.id)}
                          className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                        >
                          {en ? "Delete" : "删除"}
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
