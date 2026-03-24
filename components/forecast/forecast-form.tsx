"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Language } from "@/lib/i18n";
import { ProductItem, Region } from "@/lib/types";

type ForecastFormProps = {
  allowedRegions: Region[];
  officesByRegion: Record<Region, string[]>;
  products: ProductItem[];
  language: Language;
};

export function ForecastForm({ allowedRegions, officesByRegion, products, language }: ForecastFormProps) {
  const router = useRouter();
  const t = {
    title: language === "en" ? "Forecast Input" : "Forecast 录入",
    subtitle:
      language === "en"
        ? "Fill monthly forecast for Product/SKU with BTO and BTS quantities."
        : "按产品/SKU 填写月度 forecast（BTO 与 BTS 数量）。",
    noProducts:
      language === "en"
        ? "No active products found. Please ask admin to add products in Product Database."
        : "未找到启用中的产品，请联系管理员在产品数据库中维护。",
    forecastMonth: language === "en" ? "Forecast Month" : "Forecast 月份",
    region: language === "en" ? "Region" : "区域",
    office: language === "en" ? "Office" : "办公室",
    productName: language === "en" ? "Product Name" : "产品名称",
    sku: "SKU",
    remark: language === "en" ? "Remark" : "备注",
    variant: language === "en" ? "Variant" : "型号",
    articleNumber: language === "en" ? "Article Number" : "Article Number",
    bto: language === "en" ? "Build to Order" : "按单生产",
    bts: language === "en" ? "Build to Stock" : "备货生产",
    saveFailed:
      language === "en"
        ? "Save failed. Please check fields and permissions."
        : "保存失败，请检查字段和权限。",
    saved: language === "en" ? "Saved successfully." : "保存成功。",
    saving: language === "en" ? "Saving..." : "保存中...",
    saveForecast: language === "en" ? "Save Forecast" : "保存 Forecast",
  };
  const defaultRegion = allowedRegions[0];
  const defaultProductName = products[0]?.productName || "";
  const defaultSku =
    products.find((item) => item.productName === defaultProductName)?.sku || "";

  const [month, setMonth] = useState("");
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [office, setOffice] = useState(officesByRegion[defaultRegion][0]);
  const [productName, setProductName] = useState(defaultProductName);
  const [sku, setSku] = useState(defaultSku);
  const [remark, setRemark] = useState("");
  const [buildToOrder, setBuildToOrder] = useState("0");
  const [buildToStock, setBuildToStock] = useState("0");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const officeOptions = useMemo(() => officesByRegion[region], [officesByRegion, region]);
  const productNameOptions = useMemo(
    () => [...new Set(products.map((item) => item.productName))],
    [products],
  );
  const skuOptions = useMemo(
    () => products.filter((item) => item.productName === productName),
    [products, productName],
  );
  const selectedProduct = useMemo(
    () => products.find((item) => item.sku === sku && item.productName === productName) || null,
    [products, productName, sku],
  );

  function onRegionChange(nextRegion: Region) {
    setRegion(nextRegion);
    setOffice(officesByRegion[nextRegion][0]);
  }

  function onProductNameChange(nextProductName: string) {
    setProductName(nextProductName);
    const firstSku = products.find((item) => item.productName === nextProductName)?.sku || "";
    setSku(firstSku);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/forecasts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        month,
        region,
        office,
        productName,
        sku,
        remark,
        buildToOrder: Number(buildToOrder || 0),
        buildToStock: Number(buildToStock || 0),
      }),
    });

    setLoading(false);

    if (!response.ok) {
      setMessage(t.saveFailed);
      return;
    }

    setMessage(t.saved);
    setRemark("");
    setBuildToOrder("0");
    setBuildToStock("0");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">{t.title}</h2>
      <p className="mt-1 text-sm text-zinc-600">
        {t.subtitle}
      </p>
      {products.length === 0 ? (
        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t.noProducts}
        </p>
      ) : null}

      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">{t.forecastMonth}</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">{t.region}</span>
          <select
            value={region}
            onChange={(event) => onRegionChange(event.target.value as Region)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          >
            {allowedRegions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">{t.office}</span>
          <select
            value={office}
            onChange={(event) => setOffice(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          >
            {officeOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">{t.productName}</span>
          <select
            value={productName}
            onChange={(event) => onProductNameChange(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          >
            {productNameOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">{t.sku}</span>
          <select
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          >
            {skuOptions.map((item) => (
              <option key={item.sku} value={item.sku}>
                {item.sku}
              </option>
            ))}
          </select>
        </label>

        <label className="block md:col-span-2">
          <span className="mb-1 block text-sm text-zinc-700">{t.remark}</span>
          <textarea
            value={remark}
            onChange={(event) => setRemark(event.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">{t.variant}</span>
          <input
            value={selectedProduct?.variant || ""}
            readOnly
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-700"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">{t.articleNumber}</span>
          <input
            value={selectedProduct?.articleNumber || ""}
            readOnly
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-700"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">{t.bto}</span>
          <input
            type="number"
            min={0}
            value={buildToOrder}
            onChange={(event) => setBuildToOrder(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">{t.bts}</span>
          <input
            type="number"
            min={0}
            value={buildToStock}
            onChange={(event) => setBuildToStock(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          />
        </label>

        <div className="md:col-span-2 flex items-center gap-3">
          <button
            type="submit"
            disabled={loading || products.length === 0}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {loading ? t.saving : t.saveForecast}
          </button>
          {message ? <span className="text-sm text-zinc-600">{message}</span> : null}
        </div>
      </form>
    </section>
  );
}
