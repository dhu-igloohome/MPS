"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { ProductItem } from "@/lib/types";

type ProductManagementProps = {
  products: ProductItem[];
};

export function ProductManagement({ products }: ProductManagementProps) {
  const router = useRouter();
  const [editable, setEditable] = useState<ProductItem[]>(products);
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [variant, setVariant] = useState("");
  const [unitCost, setUnitCost] = useState("0");
  const [articleNumber, setArticleNumber] = useState("");
  const [message, setMessage] = useState("");

  function mapHeader(input: string) {
    const normalized = input.trim().toLowerCase().replaceAll("_", " ");
    if (normalized === "product name") return "productName";
    if (normalized === "sku") return "sku";
    if (normalized === "variant") return "variant";
    if (normalized === "unit cost") return "unitCost";
    if (normalized === "article number") return "articleNumber";
    return null;
  }

  async function handleBatchFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage("");

    const content = await file.text();
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      setMessage("CSV is empty.");
      return;
    }

    const rawHeaders = lines[0].split(",").map((h) => h.trim());
    const headerMap = rawHeaders.map(mapHeader);

    const requiredHeaders: Array<"productName" | "sku" | "variant" | "unitCost" | "articleNumber"> =
      ["productName", "sku", "variant", "unitCost", "articleNumber"];
    for (const required of requiredHeaders) {
      if (!headerMap.includes(required)) {
        setMessage(`Missing required header: ${required}`);
        return;
      }
    }

    const rows = lines.slice(1).map((line) => line.split(",").map((item) => item.trim()));
    const items = rows.map((columns) => {
      const payload: Record<string, string | number> = {};
      headerMap.forEach((mapped, index) => {
        if (!mapped) return;
        payload[mapped] = columns[index] || "";
      });
      return {
        productName: String(payload.productName || ""),
        sku: String(payload.sku || ""),
        variant: String(payload.variant || ""),
        unitCost: Number(payload.unitCost || 0),
        articleNumber: String(payload.articleNumber || ""),
      };
    });

    const response = await fetch("/api/admin/products/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      setMessage("Batch upload failed. Please check CSV headers and values.");
      return;
    }

    const result = (await response.json()) as { count?: number };
    setMessage(`Batch upload success: ${result.count || 0} rows processed.`);
    event.target.value = "";
    router.refresh();
  }

  useEffect(() => {
    setEditable(products);
  }, [products]);

  async function createItem(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName,
        sku,
        variant,
        unitCost: Number(unitCost || 0),
        articleNumber,
      }),
    });
    if (!response.ok) {
      setMessage("Create product failed.");
      return;
    }
    setMessage("Product created.");
    setProductName("");
    setSku("");
    setVariant("");
    setUnitCost("0");
    setArticleNumber("");
    router.refresh();
  }

  async function saveItem(item: ProductItem) {
    const response = await fetch(`/api/admin/products/${encodeURIComponent(item.sku)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: item.productName,
        variant: item.variant,
        unitCost: item.unitCost,
        articleNumber: item.articleNumber,
        isActive: item.isActive,
      }),
    });
    if (!response.ok) {
      setMessage("Update product failed.");
      return;
    }
    setMessage(`Saved ${item.sku}.`);
    router.refresh();
  }

  function updateRow(skuKey: string, patch: Partial<ProductItem>) {
    setEditable((prev) => prev.map((item) => (item.sku === skuKey ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-zinc-900">Create Product</h3>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={createItem}>
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="Product Name"
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="SKU"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="Variant"
            value={variant}
            onChange={(event) => setVariant(event.target.value)}
            required
          />
          <input
            type="number"
            step="0.01"
            min={0}
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="Unit Cost"
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 md:col-span-2"
            placeholder="Article Number"
            value={articleNumber}
            onChange={(event) => setArticleNumber(event.target.value)}
            required
          />
          <div className="md:col-span-2">
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700">
              Create
            </button>
          </div>
        </form>
        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-800">Batch Create / Update via Attachment (CSV)</p>
          <p className="mt-1 text-xs text-zinc-600">
            Headers: product name, SKU, variant, unit cost, article number
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleBatchFileUpload}
            className="mt-3 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-zinc-900">Product Database</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-2 py-2">Product Name</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">Variant</th>
                <th className="px-2 py-2">Unit Cost</th>
                <th className="px-2 py-2">Article Number</th>
                <th className="px-2 py-2">Active</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {editable.map((item) => (
                <tr key={item.sku} className="border-b border-zinc-100">
                  <td className="px-2 py-2">
                    <input
                      value={item.productName}
                      onChange={(event) => updateRow(item.sku, { productName: event.target.value })}
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">{item.sku}</td>
                  <td className="px-2 py-2">
                    <input
                      value={item.variant}
                      onChange={(event) => updateRow(item.sku, { variant: event.target.value })}
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.unitCost}
                      onChange={(event) => updateRow(item.sku, { unitCost: Number(event.target.value) })}
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={item.articleNumber}
                      onChange={(event) => updateRow(item.sku, { articleNumber: event.target.value })}
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(event) => updateRow(item.sku, { isActive: event.target.checked })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => saveItem(item)}
                      className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {message ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
