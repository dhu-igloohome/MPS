"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Language } from "@/lib/i18n";
import type { SkuProductRequest } from "@/lib/types";

type Props = {
  language: Language;
  initialPending: SkuProductRequest[];
  /** Refetch queue after approve/reject (client-loaded pages). */
  onQueueChanged?: () => void;
};

export function SkuProductRequestPanel({ language, initialPending, onQueueChanged }: Props) {
  const router = useRouter();
  const en = language === "en";
  const t = {
    title: en ? "SKU product requests" : "SKU 产品申请",
    hint: en
      ? "Approve to add the SKU to the product database (active). Requesters can then select it on Forecast."
      : "批准后 SKU 写入产品数据库并启用；申请人即可在 Forecast 中选择。",
    empty: en ? "No pending requests." : "暂无待审批申请。",
    product: en ? "Product" : "产品",
    sku: "SKU",
    variant: en ? "Variant" : "型号",
    by: en ? "Requested by" : "申请人",
    at: en ? "Requested at" : "申请时间",
    note: en ? "Note" : "说明",
    approve: en ? "Approve" : "批准",
    reject: en ? "Reject" : "拒绝",
    rejectComment: en ? "Rejection reason" : "拒绝原因",
    confirmReject: en ? "Confirm reject" : "确认拒绝",
    cancel: en ? "Cancel" : "取消",
    processing: en ? "Processing…" : "处理中…",
  };

  const [pending, setPending] = useState(initialPending);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<SkuProductRequest | null>(null);
  const [rejectComment, setRejectComment] = useState("");
  const [message, setMessage] = useState("");

  async function onApprove(id: string) {
    setBusyId(id);
    setMessage("");
    const res = await fetch(`/api/sku-product-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve" }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.message || (en ? "Approve failed." : "批准失败。"));
      return;
    }
    setPending((prev) => prev.filter((r) => r.id !== id));
    onQueueChanged?.();
    router.refresh();
  }

  async function onConfirmReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejecting) return;
    setBusyId(rejecting.id);
    setMessage("");
    const res = await fetch(`/api/sku-product-requests/${rejecting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reject", reviewComment: rejectComment.trim() }),
    });
    const data = (await res.json().catch(() => ({}))) as { message?: string };
    setBusyId(null);
    if (!res.ok) {
      setMessage(data.message || (en ? "Reject failed." : "拒绝失败。"));
      return;
    }
    setRejecting(null);
    setRejectComment("");
    setPending((prev) => prev.filter((r) => r.id !== rejecting.id));
    onQueueChanged?.();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{t.title}</h3>
        <p className="mt-1 text-sm text-app-muted">{t.hint}</p>
      </div>
      {message ? <p className="text-sm text-red-600">{message}</p> : null}
      {pending.length === 0 ? (
        <p className="text-sm text-app-muted">{t.empty}</p>
      ) : (
        <div className="app-table-shell overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left text-app-muted">
                <th className="px-2 py-2">{t.product}</th>
                <th className="px-2 py-2">{t.sku}</th>
                <th className="px-2 py-2">{t.variant}</th>
                <th className="px-2 py-2">{t.by}</th>
                <th className="px-2 py-2">{t.at}</th>
                <th className="px-2 py-2">{t.note}</th>
                <th className="px-2 py-2">{en ? "Actions" : "操作"}</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((row) => (
                <tr key={row.id} className="border-b border-app-border/60">
                  <td className="px-2 py-2">{row.productName}</td>
                  <td className="px-2 py-2 font-medium">{row.sku}</td>
                  <td className="px-2 py-2">{row.variant}</td>
                  <td className="px-2 py-2">{row.requestedBy}</td>
                  <td className="whitespace-nowrap px-2 py-2 tabular-nums text-app-muted">
                    {row.requestedAt.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="max-w-[12rem] truncate px-2 py-2" title={row.requestNote}>
                    {row.requestNote || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void onApprove(row.id)}
                        className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {busyId === row.id ? t.processing : t.approve}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => {
                          setRejecting(row);
                          setRejectComment("");
                        }}
                        className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                      >
                        {t.reject}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejecting ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal
          onClick={(ev) => {
            if (ev.target === ev.currentTarget && !busyId) setRejecting(null);
          }}
        >
          <form
            onSubmit={onConfirmReject}
            className="w-full max-w-md rounded-2xl border border-app-border bg-app-surface p-5 shadow-lg"
          >
            <h4 className="font-semibold text-foreground">
              {t.reject}: {rejecting.sku}
            </h4>
            <label className="mt-3 block">
              <span className="mb-1 block text-sm font-medium">{t.rejectComment}</span>
              <textarea
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                required
                rows={3}
                className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                autoFocus
              />
            </label>
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={Boolean(busyId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {t.confirmReject}
              </button>
              <button
                type="button"
                disabled={Boolean(busyId)}
                onClick={() => setRejecting(null)}
                className="rounded-lg border border-app-border px-4 py-2 text-sm"
              >
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
