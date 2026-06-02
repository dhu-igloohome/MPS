"use client";

import { useCallback, useEffect, useState } from "react";

import { SkuProductRequestPanel } from "@/components/admin/sku-product-request-panel";
import type { Language } from "@/lib/i18n";
import type { SkuProductRequest } from "@/lib/types";

type Props = {
  language: Language;
};

export function SkuRequestsPageClient({ language }: Props) {
  const en = language === "en";
  const [pending, setPending] = useState<SkuProductRequest[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/sku-product-requests?pending=1", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as {
        entries?: SkuProductRequest[];
        message?: string;
      };
      if (!res.ok) {
        setLoadError(data.message || (en ? "Could not load requests." : "无法加载申请列表。"));
        setPending([]);
        return;
      }
      setPending(data.entries ?? []);
    } catch {
      setLoadError(en ? "Could not load requests." : "无法加载申请列表。");
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, [en]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="text-sm text-app-muted">{en ? "Loading…" : "加载中…"}</p>
    );
  }

  return (
    <>
      {loadError ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
        </p>
      ) : null}
      <SkuProductRequestPanel
        language={language}
        initialPending={pending}
        onQueueChanged={load}
      />
    </>
  );
}
