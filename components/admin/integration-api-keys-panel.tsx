"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, Trash2 } from "lucide-react";
import { toast } from "sonner";

import type { Language } from "@/lib/i18n";
import type { IntegrationApiKeyEntry } from "@/lib/types";

type IntegrationApiKeysPanelProps = {
  keys: IntegrationApiKeyEntry[];
  language: Language;
  siteOrigin: string;
};

export function IntegrationApiKeysPanel({ keys, language, siteOrigin }: IntegrationApiKeysPanelProps) {
  const router = useRouter();
  const en = language === "en";
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const t = {
    title: en ? "Integration API keys" : "集成 API 密钥",
    intro: en
      ? "Long-lived keys for partner systems (e.g. external inventory apps). Keys are shown once at creation; only a prefix is stored for reference."
      : "供外部系统（如同事自建的库存网站）长期调用的 API 密钥。完整密钥仅在创建时显示一次，之后只保留前缀供识别。",
    label: en ? "Partner label" : "合作方名称",
    labelPh: en ? "e.g. Berfin" : "如 Berfin",
    create: en ? "Create API key" : "创建 API 密钥",
    revoke: en ? "Revoke" : "吊销",
    prefix: en ? "Key prefix" : "密钥前缀",
    scopes: en ? "Scopes" : "权限范围",
    lastUsed: en ? "Last used" : "最近使用",
    status: en ? "Status" : "状态",
    active: en ? "Active" : "有效",
    revoked: en ? "Revoked" : "已吊销",
    created: en ? "Created" : "创建时间",
    copyKey: en ? "Copy key" : "复制密钥",
    copyHint: en
      ? "Copy this key now and send it securely to your colleague. It will not be shown again."
      : "请立即复制并通过安全渠道发给同事，关闭后无法再次查看完整密钥。",
    baseUrl: en ? "Base URL" : "接口地址",
    health: en ? "Health check" : "连通测试",
    inventory: en ? "Global inventory (read)" : "全球库存（只读）",
    empty: en ? "No integration keys yet." : "暂无集成密钥。",
    createFailed: en ? "Create failed." : "创建失败。",
    revokeFailed: en ? "Revoke failed." : "吊销失败。",
    createdOk: en ? "API key created." : "API 密钥已创建。",
    revokedOk: en ? "Key revoked." : "密钥已吊销。",
    copied: en ? "Copied." : "已复制。",
  };

  const base = siteOrigin.replace(/\/+$/, "");

  async function onCreate() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setBusy(true);
    setCreatedKey(null);
    try {
      const res = await fetch("/api/admin/integration-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: trimmed, scopes: ["inventory:read"] }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; apiKey?: string };
      if (!res.ok || !data.apiKey) {
        toast.error(data.message || t.createFailed);
        return;
      }
      setCreatedKey(data.apiKey);
      setLabel("");
      toast.success(t.createdOk);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function onRevoke(id: string) {
    if (!window.confirm(en ? "Revoke this API key? Partner apps will stop working immediately." : "确定吊销此密钥？对方系统将立刻无法访问。")) {
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/integration-keys/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        toast.error(data.message || t.revokeFailed);
        return;
      }
      toast.success(t.revokedOk);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <KeyRound className="mt-0.5 h-5 w-5 shrink-0 text-app-accent" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-semibold text-foreground">{t.title}</h3>
          <p className="mt-1 max-w-3xl text-sm leading-relaxed text-foreground/70">{t.intro}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-app-border/70 bg-slate-50 p-4 text-sm dark:bg-transparent">
        <p className="font-medium text-foreground">{t.baseUrl}</p>
        <p className="mt-1 font-mono text-xs text-foreground/80">{base}</p>
        <ul className="mt-3 space-y-1.5 font-mono text-xs text-foreground/75">
          <li>
            GET {base}/api/integrations/v1/health
          </li>
          <li>
            GET {base}/api/integrations/v1/inventory-global
          </li>
          <li className="text-foreground/55">
            Header: Authorization: Bearer mps_…
          </li>
        </ul>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="min-w-0 shrink-0">
          <span className="block text-xs font-medium text-foreground/70">{t.label}</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t.labelPh}
            className="app-control-md mt-1 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm outline-none ring-app-accent focus:ring-2"
          />
        </label>
        <button
          type="button"
          disabled={busy || !label.trim()}
          onClick={() => void onCreate()}
          className="app-button-primary shrink-0 px-4 py-2 text-sm transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
        >
          {t.create}
        </button>
      </div>

      {createdKey ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:bg-amber-500/10">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-200">{t.copyHint}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="break-all rounded-lg bg-white/80 px-2 py-1.5 font-mono text-xs text-foreground dark:bg-black/20">
              {createdKey}
            </code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(createdKey);
                toast.success(t.copied);
              }}
              className="app-button-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
            >
              <Copy size={14} strokeWidth={1.5} />
              {t.copyKey}
            </button>
          </div>
        </div>
      ) : null}

      <div className="app-table-shell mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-app-border/80 text-left text-xs font-semibold uppercase tracking-wider text-foreground/65">
              <th className="px-2 py-2">{t.label}</th>
              <th className="px-2 py-2">{t.prefix}</th>
              <th className="px-2 py-2">{t.scopes}</th>
              <th className="px-2 py-2">{t.status}</th>
              <th className="px-2 py-2">{t.lastUsed}</th>
              <th className="px-2 py-2">{t.created}</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-app-muted">
                  {t.empty}
                </td>
              </tr>
            ) : (
              keys.map((k) => (
                <tr key={k.id} className="border-b border-app-border/50">
                  <td className="px-2 py-2 font-medium">{k.label}</td>
                  <td className="px-2 py-2 font-mono text-xs">mps_{k.keyPrefix}…</td>
                  <td className="px-2 py-2 text-xs">{k.scopes.join(", ")}</td>
                  <td className="px-2 py-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ${
                        k.isActive
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-slate-100 text-slate-600 ring-slate-200"
                      }`}
                    >
                      {k.isActive ? t.active : t.revoked}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-xs text-app-muted">
                    {k.lastUsedAt
                      ? new Date(k.lastUsedAt).toLocaleString(en ? "en-US" : "zh-CN")
                      : "—"}
                  </td>
                  <td className="px-2 py-2 text-xs text-app-muted">
                    {new Date(k.createdAt).toLocaleString(en ? "en-US" : "zh-CN")}
                  </td>
                  <td className="px-2 py-2">
                    {k.isActive ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void onRevoke(k.id)}
                        className="inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                        {t.revoke}
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
