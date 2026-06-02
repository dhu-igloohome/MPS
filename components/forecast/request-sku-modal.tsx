"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";

type Props = {
  language: Language;
  open: boolean;
  onClose: () => void;
};

export function RequestSkuModal({ language, open, onClose }: Props) {
  const router = useRouter();
  const en = language === "en";
  const t = {
    title: en ? "Request new SKU" : "申请新 SKU",
    hint: en
      ? "Submit for super admin approval. Once approved, the SKU appears in the Forecast dropdown."
      : "提交后由超级管理员审批；通过后 SKU 将出现在 Forecast 下拉列表中。",
    productName: en ? "Product name" : "产品名称",
    sku: "SKU",
    skuHint: en ? "Uppercase letters and numbers only (e.g. SP3B)" : "仅大写字母与数字（如 SP3B）",
    variant: en ? "Variant" : "型号",
    variantHint: en ? "Default 1 if unsure" : "不确定时请填 1",
    note: en ? "Note (optional)" : "说明（可选）",
    submit: en ? "Submit request" : "提交申请",
    submitting: en ? "Submitting…" : "提交中…",
    cancel: en ? "Cancel" : "取消",
  };

  const [productName, setProductName] = useState("");
  const [sku, setSku] = useState("");
  const [variant, setVariant] = useState("1");
  const [requestNote, setRequestNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!open) return null;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/sku-product-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: productName.trim(),
        sku: sku.trim().toUpperCase(),
        variant: variant.trim() || "1",
        requestNote: requestNote.trim(),
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || (en ? "Submit failed." : "提交失败。"));
      return;
    }
    setProductName("");
    setSku("");
    setVariant("1");
    setRequestNote("");
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="request-sku-title"
      onClick={(ev) => {
        if (ev.target === ev.currentTarget && !loading) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg">
        <h3 id="request-sku-title" className="text-base font-semibold text-foreground">
          {t.title}
        </h3>
        <p className="mt-1 text-xs text-app-muted">{t.hint}</p>
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground/85">{t.productName}</span>
            <input
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
              className="app-control-md w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground/85">{t.sku}</span>
            <input
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              required
              className="app-control-md w-full px-3 py-2 text-sm uppercase"
              placeholder="SP3B"
            />
            <span className="mt-0.5 block text-[11px] text-app-muted">{t.skuHint}</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground/85">{t.variant}</span>
            <input
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              className="app-control-md w-full px-3 py-2 text-sm"
            />
            <span className="mt-0.5 block text-[11px] text-app-muted">{t.variantHint}</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-foreground/85">{t.note}</span>
            <textarea
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
            />
          </label>
          {message ? <p className="text-sm text-red-600">{message}</p> : null}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-50"
            >
              {loading ? t.submitting : t.submit}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-lg border border-app-border px-4 py-2 text-sm text-foreground/85 hover:bg-app-accent-soft"
            >
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
