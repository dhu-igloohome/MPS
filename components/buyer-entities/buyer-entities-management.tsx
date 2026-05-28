"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { BuyerEntityEntry, BuyerEntityCode } from "@/lib/types";
import type { Language } from "@/lib/i18n";

type Props = {
  language: Language;
  initialBuyerEntities: BuyerEntityEntry[];
  canEdit: boolean;
};

const DEFAULT_CODES: BuyerEntityCode[] = ["shenzhen", "singapore"];

function emptyRow(code: BuyerEntityCode): BuyerEntityEntry {
  return {
    code,
    legalName: "",
    address: "",
    contactName: "",
    contactPhone: "",
    email: "",
    companyRegNo: "",
    gstRegNo: "",
    isActive: true,
    updatedBy: "",
    updatedAt: "",
  };
}

export function BuyerEntitiesManagement({ language, initialBuyerEntities, canEdit }: Props) {
  const router = useRouter();
  const en = language === "en";
  const t = {
    title: en ? "Buyer Entities" : "需方信息（Buyer Entities）",
    hint: en
      ? "These fields appear on contract detail and printed PO as Buyer info."
      : "这些字段会显示在合同详情与打印 PO 的 Buyer 区块。",
    legalName: en ? "Legal name" : "公司名称",
    address: en ? "Address" : "地址",
    contactName: en ? "Contact" : "联系人",
    contactPhone: en ? "Phone" : "电话",
    email: en ? "Email" : "邮箱",
    companyRegNo: en ? "Company reg no" : "公司注册号",
    gstRegNo: en ? "GST reg no" : "GST 税号",
    active: en ? "Active" : "启用",
    save: en ? "Save" : "保存",
    saving: en ? "Saving…" : "保存中…",
    noPerm: en ? "You do not have permission to edit." : "当前账号无权限编辑（仅 super_admin 可改）。",
  };

  const merged = useMemo(() => {
    const byCode = new Map<BuyerEntityCode, BuyerEntityEntry>();
    for (const e of initialBuyerEntities) byCode.set(e.code, e);
    return DEFAULT_CODES.map((c) => byCode.get(c) ?? emptyRow(c));
  }, [initialBuyerEntities]);

  const [editingCode, setEditingCode] = useState<BuyerEntityCode>("shenzhen");
  const [form, setForm] = useState<BuyerEntityEntry>(() => merged[0] ?? emptyRow("shenzhen"));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function startEdit(code: BuyerEntityCode) {
    const row = merged.find((m) => m.code === code) ?? emptyRow(code);
    setEditingCode(code);
    setForm(row);
    setMessage("");
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/buyer-entities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: editingCode,
        legalName: form.legalName,
        address: form.address,
        contactName: form.contactName,
        contactPhone: form.contactPhone,
        email: form.email,
        companyRegNo: form.companyRegNo,
        gstRegNo: form.gstRegNo,
        isActive: form.isActive,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!res.ok) {
      setMessage(data.message || "Save failed");
      return;
    }
    router.refresh();
    setMessage(en ? "Saved." : "已保存。");
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
        <p className="mt-1 text-sm text-app-muted">{t.hint}</p>
        {!canEdit ? <p className="mt-2 text-sm text-amber-700">{t.noPerm}</p> : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {DEFAULT_CODES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => startEdit(c)}
              className={`rounded-lg border px-3 py-2 text-sm ${
                editingCode === c ? "border-app-border bg-white shadow-sm" : "border-app-border/70 bg-app-surface"
              }`}
            >
              {c === "shenzhen" ? (en ? "Shenzhen" : "深圳主体") : en ? "Singapore" : "新加坡主体"}
            </button>
          ))}
        </div>

        <form className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={onSave}>
          <input
            value={form.legalName}
            onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))}
            placeholder={t.legalName}
            required
            disabled={!canEdit || loading}
            className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm"
          />
          <input
            value={form.contactName}
            onChange={(e) => setForm((p) => ({ ...p, contactName: e.target.value }))}
            placeholder={t.contactName}
            disabled={!canEdit || loading}
            className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm"
          />
          <input
            value={form.contactPhone}
            onChange={(e) => setForm((p) => ({ ...p, contactPhone: e.target.value }))}
            placeholder={t.contactPhone}
            disabled={!canEdit || loading}
            className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm"
          />
          <input
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder={t.email}
            disabled={!canEdit || loading}
            className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm"
          />
          <input
            value={form.companyRegNo ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, companyRegNo: e.target.value }))}
            placeholder={t.companyRegNo}
            disabled={!canEdit || loading}
            className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm"
          />
          <input
            value={form.gstRegNo ?? ""}
            onChange={(e) => setForm((p) => ({ ...p, gstRegNo: e.target.value }))}
            placeholder={t.gstRegNo}
            disabled={!canEdit || loading}
            className="min-w-0 rounded-lg border border-app-border px-3 py-2 text-sm"
          />
          <div className="sm:col-span-2 lg:col-span-3">
            <input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder={t.address}
              required
              disabled={!canEdit || loading}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
            />
          </div>
          <label className="flex min-w-0 items-center gap-2 rounded-lg border border-app-border px-3 py-2 text-sm sm:col-span-2 lg:col-span-3">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
              disabled={!canEdit || loading}
            />
            {t.active}
          </label>

          <div className="flex min-w-0 gap-2 sm:col-span-2 lg:col-span-3">
            <button
              type="submit"
              disabled={!canEdit || loading || !form.legalName.trim() || !form.address.trim()}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60"
            >
              {loading ? t.saving : t.save}
            </button>
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-app-muted">{message}</p> : null}
      </section>
    </div>
  );
}

