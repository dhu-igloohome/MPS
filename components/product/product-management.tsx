"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  ccInputMd,
  ccInputSm,
  ccNum,
} from "@/components/cost-control/cost-control-form-controls";
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
    productNameCn: language === "en" ? "Chinese Name" : "中文名称",
    productNameCnHint:
      language === "en"
        ? "Used as the PO line description for domestic (China) suppliers; English name is used for everyone else."
        : "国内供应商的合同 PO 会用这个中文名称作为品名，其他供应商仍然用英文名称。",
    sku: "SKU",
    variant: language === "en" ? "Variant" : "型号",
    unitCost: language === "en" ? "Unit Cost (optional)" : "单价（可选）",
    articleNumber: language === "en" ? "Article Number (optional)" : "Article Number（可选）",
    create: language === "en" ? "Create" : "创建",
    batchTitle:
      language === "en" ? "Batch Create / Update via Attachment (CSV)" : "通过附件（CSV）批量创建 / 更新",
    headers:
      language === "en"
        ? "Headers: product name, chinese name, SKU, variant, unit cost, article number"
        : "表头：product name, chinese name, SKU, variant, unit cost, article number",
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
    prodSteps: language === "en" ? "Production steps" : "生产工序",
    prodStepsHint:
      language === "en"
        ? "One step per line (max 40). Applies to this product name + SKU (all variants)."
        : "每行一道工序（最多 40 条）。按产品名称 + SKU 生效，同 SKU 下所有型号共用。",
    prodStepsLoadFailed:
      language === "en" ? "Could not load production steps." : "加载生产工序失败。",
    prodStepsSaveFailed:
      language === "en" ? "Could not save production steps." : "保存生产工序失败。",
    prodStepsSaved: language === "en" ? "Production steps saved." : "生产工序已保存。",
    close: language === "en" ? "Close" : "关闭",
  };
  const [editable, setEditable] = useState<ProductItem[]>(products);
  const [productName, setProductName] = useState("");
  const [productNameCn, setProductNameCn] = useState("");
  const [sku, setSku] = useState("");
  const [variant, setVariant] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [articleNumber, setArticleNumber] = useState("");
  const [message, setMessage] = useState("");
  const [templateModal, setTemplateModal] = useState<{
    productName: string;
    sku: string;
  } | null>(null);
  const [templateDraft, setTemplateDraft] = useState("");
  const [templateBusy, setTemplateBusy] = useState(false);

  function downloadCsvTemplate() {
    const headers = "product name,chinese name,SKU,variant,unit cost,article number";
    const sample =
      "Deadbolt 2S,智能横闩锁,IGB4,Default,120,ART-1001\nEntry Level DB,,DBX1,Default,180,ART-1002\nKeybox 3,智能钥匙盒,IGK3,Default,95,ART-2001";
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
    if (normalized === "chinese name" || normalized === "product name cn") return "productNameCn";
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
        productNameCn: String(payload.productNameCn || ""),
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
        productNameCn,
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
    setProductNameCn("");
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
        productNameCn: item.productNameCn,
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

  async function openProductionTemplate(item: ProductItem) {
    setMessage("");
    setTemplateModal({ productName: item.productName, sku: item.sku });
    setTemplateDraft("");
    setTemplateBusy(true);
    const q = new URLSearchParams({ productName: item.productName, sku: item.sku });
    const res = await fetch(`/api/admin/production-templates?${q.toString()}`);
    setTemplateBusy(false);
    if (!res.ok) {
      setMessage(t.prodStepsLoadFailed);
      setTemplateModal(null);
      return;
    }
    const data = (await res.json()) as { steps?: { label: string }[] };
    setTemplateDraft((data.steps ?? []).map((s) => s.label).join("\n"));
  }

  async function saveProductionTemplate() {
    if (!templateModal) return;
    setTemplateBusy(true);
    setMessage("");
    const labels = templateDraft.split(/\r?\n/).map((line) => line);
    const res = await fetch("/api/admin/production-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: templateModal.productName,
        sku: templateModal.sku,
        labels,
      }),
    });
    setTemplateBusy(false);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setMessage(data.message || t.prodStepsSaveFailed);
      return;
    }
    setMessage(t.prodStepsSaved);
    setTemplateModal(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="app-card p-5">
        <h3 className="text-lg font-semibold text-foreground">{t.createProduct}</h3>
        <form className="mt-4 flex min-w-0 flex-wrap items-end gap-x-3 gap-y-2" onSubmit={createItem}>
          <input
            className={ccInputMd}
            placeholder={t.productName}
            value={productName}
            onChange={(event) => setProductName(event.target.value)}
            required
          />
          <input
            className={ccInputMd}
            placeholder={t.productNameCn}
            title={t.productNameCnHint}
            value={productNameCn}
            onChange={(event) => setProductNameCn(event.target.value)}
          />
          <input
            className={ccInputSm}
            placeholder={t.sku}
            value={sku}
            onChange={(event) => setSku(event.target.value.toUpperCase())}
            required
          />
          <input
            className={ccInputSm}
            placeholder={t.variant}
            value={variant}
            onChange={(event) => setVariant(event.target.value.toUpperCase())}
            required
          />
          <input
            type="number"
            step="0.01"
            min={0}
            className={ccNum}
            placeholder={t.unitCost}
            value={unitCost}
            onChange={(event) => setUnitCost(event.target.value)}
            title={t.unitCost}
          />
          <input
            className={ccInputMd}
            placeholder={t.articleNumber}
            value={articleNumber}
            onChange={(event) => setArticleNumber(event.target.value)}
          />
          <button type="submit" className="shrink-0 app-button-primary px-4 py-2 text-sm">
            {t.create}
          </button>
        </form>
        <div className="mt-4 rounded-xl border border-dashed border-app-border bg-gray-50 p-4">
          <p className="text-sm font-medium text-foreground/90">{t.batchTitle}</p>
          <details className="mt-1 text-xs text-app-muted">
            <summary className="cursor-pointer select-none font-medium text-foreground/80">
              {language === "en" ? "CSV format" : "CSV 格式说明"}
            </summary>
            <p className="mt-1 max-w-3xl leading-relaxed">{t.headers}</p>
          </details>
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="app-button-secondary mt-2 px-3 py-1.5 text-sm"
          >
            {t.downloadTemplate}
          </button>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleBatchFileUpload}
            className="mt-3 block max-w-md text-sm text-foreground/85 file:mr-3 file:rounded-lg file:border file:border-app-border file:bg-app-surface file:px-3 file:py-1.5 file:text-sm"
          />
        </div>
      </section>

      <section className="app-card p-5">
        <h3 className="text-lg font-semibold text-foreground">{t.tableTitle}</h3>
        <div className="app-table-shell mt-3 overflow-x-auto">
          <table className="app-table min-w-[1080px]">
            <thead>
              <tr>
                <th>{t.productName}</th>
                <th title={t.productNameCnHint}>{t.productNameCn}</th>
                <th>{t.sku}</th>
                <th>{t.variant}</th>
                <th>{language === "en" ? "Unit Cost" : "单价"}</th>
                <th>{language === "en" ? "Article Number" : "Article Number"}</th>
                <th>{t.active}</th>
                <th>{t.prodSteps}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {editable.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      value={item.productName}
                      onChange={(event) => updateRow(item.id, { productName: event.target.value })}
                      title={item.productName}
                      className={`${ccInputMd} !w-[28rem] !max-w-[28rem] py-1`}
                    />
                  </td>
                  <td>
                    <input
                      value={item.productNameCn}
                      onChange={(event) => updateRow(item.id, { productNameCn: event.target.value })}
                      title={t.productNameCnHint}
                      className={`${ccInputMd} !w-[16rem] !max-w-[16rem] py-1`}
                    />
                  </td>
                  <td>
                    <input
                      value={item.sku}
                      onChange={(event) => updateRow(item.id, { sku: event.target.value.toUpperCase() })}
                      className={`${ccInputSm} py-1`}
                    />
                  </td>
                  <td>
                    <input
                      value={item.variant}
                      onChange={(event) =>
                        updateRow(item.id, { variant: event.target.value.toUpperCase() })
                      }
                      className={`${ccInputSm} py-1`}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.unitCost}
                      onChange={(event) => updateRow(item.id, { unitCost: Number(event.target.value) })}
                      className={`${ccNum} py-1`}
                    />
                  </td>
                  <td>
                    <input
                      value={item.articleNumber}
                      onChange={(event) => updateRow(item.id, { articleNumber: event.target.value })}
                      className={`${ccInputMd} max-w-[12rem] py-1`}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(event) => updateRow(item.id, { isActive: event.target.checked })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => openProductionTemplate(item)}
                      className="app-button-secondary px-2 py-1 text-xs"
                    >
                      {t.prodSteps}
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => saveItem(item)}
                        className="app-button-secondary px-2 py-1 text-sm"
                      >
                        {t.save}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteItem(item)}
                        className="rounded-lg border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50"
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
        <p className="app-card px-4 py-2 text-sm text-foreground/85">
          {message}
        </p>
      ) : null}

      {templateModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prod-template-title"
        >
          <div className="app-card max-h-[90vh] w-full max-w-lg overflow-y-auto p-5">
            <h4 id="prod-template-title" className="text-lg font-semibold text-foreground">
              {t.prodSteps}
            </h4>
            <p className="mt-1 text-sm text-app-muted">
              {templateModal.productName} · {templateModal.sku}
            </p>
            <p className="mt-2 text-xs text-app-muted">{t.prodStepsHint}</p>
            <textarea
              value={templateDraft}
              onChange={(e) => setTemplateDraft(e.target.value)}
              disabled={templateBusy}
              rows={14}
              className="mt-3 w-full min-w-0 rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm disabled:opacity-60"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={templateBusy}
                onClick={() => saveProductionTemplate()}
                className="app-button-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                {t.save}
              </button>
              <button
                type="button"
                disabled={templateBusy}
                onClick={() => setTemplateModal(null)}
                className="app-button-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
