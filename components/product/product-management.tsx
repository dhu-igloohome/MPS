"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Language } from "@/lib/i18n";
import { ProductItem } from "@/lib/types";

type ProductManagementProps = {
  products: ProductItem[];
  language: Language;
};

export function ProductManagement({ products, language }: ProductManagementProps) {
  const router = useRouter();
  const t = {
    createProduct: language === "en" ? "Create Product" : "创建产品",
    productName: language === "en" ? "Product Name" : "产品名称",
    sku: "SKU",
    variant: language === "en" ? "Variant" : "型号",
    unitCost: language === "en" ? "Unit Cost (optional)" : "单价（可选）",
    articleNumber: language === "en" ? "Article Number (optional)" : "Article Number（可选）",
    create: language === "en" ? "Create" : "创建",
    batchTitle:
      language === "en" ? "Batch Create / Update via Attachment (CSV)" : "通过附件（CSV）批量创建 / 更新",
    headers:
      language === "en"
        ? "Headers: product name, SKU, variant, unit cost, article number"
        : "表头：product name, SKU, variant, unit cost, article number",
    downloadTemplate: language === "en" ? "Download CSV template" : "下载 CSV 模板",
    tableTitle: language === "en" ? "Product Database" : "产品数据库",
    active: language === "en" ? "Active" : "启用",
    actions: language === "en" ? "Actions" : "操作",
    save: language === "en" ? "Save" : "保存",
    delete: language === "en" ? "Delete" : "删除",
    csvEmpty: language === "en" ? "CSV is empty." : "CSV 为空。",
    missingHeader: language === "en" ? "Missing required header: {header}" : "缺少必需表头：{header}",
    batchFailed:
      language === "en"
        ? "Batch upload failed. Please check CSV headers and values."
        : "批量上传失败，请检查 CSV 表头和数据。",
    batchSuccess:
      language === "en"
        ? "Batch upload success: {count} rows processed."
        : "批量上传成功：已处理 {count} 行。",
    createFailed: language === "en" ? "Create product failed." : "创建产品失败。",
    productCreated: language === "en" ? "Product created." : "产品已创建。",
    updateFailed: language === "en" ? "Update product failed." : "更新产品失败。",
    saved: language === "en" ? "Saved {sku}." : "已保存 {sku}。",
    deleteConfirm:
      language === "en"
        ? "Delete product {name} / {sku} / {variant}?"
        : "确认删除产品 {name} / {sku} / {variant}？",
    deleteFailed: language === "en" ? "Delete product failed." : "删除产品失败。",
    deleted: language === "en" ? "Deleted {sku} ({variant})." : "已删除 {sku}（{variant}）。",
  };
  const [editable, setEditable] = useState<ProductItem[]>(products);
  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [variant, setVariant] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [articleNumber, setArticleNumber] = useState("");
  const [message, setMessage] = useState("");

  function downloadCsvTemplate() {
    const headers = "product name,SKU,variant,unit cost,article number";
    const sample =
      "Deadbolt 2S,IGB4,Default,120,ART-1001\nEntry Level DB,DBX1,Default,180,ART-1002\nKeybox 3,IGK3,Default,95,ART-2001";
    const csv = `${headers}\n${sample}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

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
      setMessage(t.csvEmpty);
      return;
    }

    const rawHeaders = lines[0].split(",").map((h) => h.trim());
    const headerMap = rawHeaders.map(mapHeader);

    const requiredHeaders: Array<"productName" | "sku" | "variant" | "unitCost" | "articleNumber"> =
      ["productName", "sku", "variant", "unitCost", "articleNumber"];
    for (const required of requiredHeaders) {
      if (!headerMap.includes(required)) {
        setMessage(t.missingHeader.replace("{header}", required));
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
      setMessage(t.batchFailed);
      return;
    }

    const result = (await response.json()) as { count?: number };
    setMessage(t.batchSuccess.replace("{count}", String(result.count || 0)));
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
      setMessage(t.createFailed);
      return;
    }
    setMessage(t.productCreated);
    setProductName("");
    setSku("");
    setVariant("");
    setUnitCost("");
    setArticleNumber("");
    router.refresh();
  }

  async function saveItem(item: ProductItem) {
    const response = await fetch(`/api/admin/products/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sku: item.sku,
        productName: item.productName,
        variant: item.variant,
        unitCost: item.unitCost,
        articleNumber: item.articleNumber,
        isActive: item.isActive,
      }),
    });
    if (!response.ok) {
      setMessage(t.updateFailed);
      return;
    }
    setMessage(t.saved.replace("{sku}", item.sku));
    router.refresh();
  }

  async function deleteItem(item: ProductItem) {
    if (
      !window.confirm(
        t.deleteConfirm
          .replace("{name}", item.productName)
          .replace("{sku}", item.sku)
          .replace("{variant}", item.variant),
      )
    ) {
      return;
    }

    const response = await fetch(`/api/admin/products/${encodeURIComponent(item.id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setMessage(t.deleteFailed);
      return;
    }
    setMessage(t.deleted.replace("{sku}", item.sku).replace("{variant}", item.variant));
    router.refresh();
  }

  function updateRow(idKey: string, patch: Partial<ProductItem>) {
    setEditable((prev) => prev.map((item) => (item.id === idKey ? { ...item, ...patch } : item)));
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-zinc-900">{t.createProduct}</h3>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={createItem}>
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder={t.productName}
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder={t.sku}
            value={sku}
            onChange={(event) => setSku(event.target.value.toUpperCase())}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder={t.variant}
            value={variant}
            onChange={(event) => setVariant(event.target.value.toUpperCase())}
            required
          />
          <input
            type="number"
            step="0.01"
            min={0}
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder={t.unitCost}
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 md:col-span-2"
            placeholder={t.articleNumber}
            value={articleNumber}
            onChange={(event) => setArticleNumber(event.target.value)}
          />
          <div className="md:col-span-2">
            <button className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700">
              {t.create}
            </button>
          </div>
        </form>
        <div className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4">
          <p className="text-sm font-medium text-zinc-800">{t.batchTitle}</p>
          <p className="mt-1 text-xs text-zinc-600">
            {t.headers}
          </p>
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="mt-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            {t.downloadTemplate}
          </button>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleBatchFileUpload}
            className="mt-3 block w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-zinc-900">{t.tableTitle}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-2 py-2">{t.productName}</th>
                <th className="px-2 py-2">{t.sku}</th>
                <th className="px-2 py-2">{t.variant}</th>
                <th className="px-2 py-2">{language === "en" ? "Unit Cost" : "单价"}</th>
                <th className="px-2 py-2">{language === "en" ? "Article Number" : "Article Number"}</th>
                <th className="px-2 py-2">{t.active}</th>
                <th className="px-2 py-2">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {editable.map((item) => (
                <tr key={item.sku} className="border-b border-zinc-100">
                  <td className="px-2 py-2">
                    <input
                      value={item.productName}
                      onChange={(event) => updateRow(item.id, { productName: event.target.value })}
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={item.sku}
                      onChange={(event) => updateRow(item.id, { sku: event.target.value.toUpperCase() })}
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={item.variant}
                      onChange={(event) =>
                        updateRow(item.id, { variant: event.target.value.toUpperCase() })
                      }
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.unitCost}
                      onChange={(event) => updateRow(item.id, { unitCost: Number(event.target.value) })}
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={item.articleNumber}
                      onChange={(event) => updateRow(item.id, { articleNumber: event.target.value })}
                      className="w-full rounded border border-zinc-300 px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(event) => updateRow(item.id, { isActive: event.target.checked })}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveItem(item)}
                        className="rounded border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
                      >
                        {t.save}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item)}
                        className="rounded border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50"
                      >
                        {t.delete}
                      </button>
                    </div>
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
