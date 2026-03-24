"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Region } from "@/lib/types";

type ForecastFormProps = {
  allowedRegions: Region[];
  officesByRegion: Record<Region, string[]>;
};

export function ForecastForm({ allowedRegions, officesByRegion }: ForecastFormProps) {
  const router = useRouter();
  const defaultRegion = allowedRegions[0];

  const [month, setMonth] = useState("");
  const [region, setRegion] = useState<Region>(defaultRegion);
  const [office, setOffice] = useState(officesByRegion[defaultRegion][0]);
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [buildToOrder, setBuildToOrder] = useState("0");
  const [buildToStock, setBuildToStock] = useState("0");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const officeOptions = useMemo(() => officesByRegion[region], [officesByRegion, region]);

  function onRegionChange(nextRegion: Region) {
    setRegion(nextRegion);
    setOffice(officesByRegion[nextRegion][0]);
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
        buildToOrder: Number(buildToOrder || 0),
        buildToStock: Number(buildToStock || 0),
      }),
    });

    setLoading(false);

    if (!response.ok) {
      setMessage("Save failed. Please check fields and permissions.");
      return;
    }

    setMessage("Saved successfully.");
    setProductName("");
    setSku("");
    setBuildToOrder("0");
    setBuildToStock("0");
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-zinc-900">Forecast Input</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Fill monthly forecast for Product/SKU with BTO and BTS quantities.
      </p>

      <form className="mt-4 grid gap-4 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Forecast Month</span>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Region</span>
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
          <span className="mb-1 block text-sm text-zinc-700">Office</span>
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
          <span className="mb-1 block text-sm text-zinc-700">Product Name</span>
          <input
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">SKU</span>
          <input
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Build to Order</span>
          <input
            type="number"
            min={0}
            value={buildToOrder}
            onChange={(event) => setBuildToOrder(event.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm text-zinc-700">Build to Stock</span>
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
            disabled={loading}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Save Forecast"}
          </button>
          {message ? <span className="text-sm text-zinc-600">{message}</span> : null}
        </div>
      </form>
    </section>
  );
}
