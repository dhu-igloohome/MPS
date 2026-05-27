"use client";

import { useMemo, useState } from "react";

import {
  ccInputMd,
  ccInputSm,
  ccLabel,
  ccSelectSm,
} from "@/components/cost-control/cost-control-form-controls";
import {
  CONTRACT_REMARK_TEMPLATES,
  type ContractRemarkTemplateId,
} from "@/lib/contract-remark-templates";
import { formatBuyerEntityLabel, getContractBuyerEntity, resolveBuyerEntityCode } from "@/lib/contract-buyer-entities";
import type { SkuContractCoverage } from "@/lib/contract-forecast-coverage";
import type { Language } from "@/lib/i18n";
import type { SupplierEntry } from "@/lib/types";

type CreateContractFromForecastModalProps = {
  language: Language;
  sku: string;
  defaultSupplier1Name: string;
  coverage: SkuContractCoverage;
  suppliers: SupplierEntry[];
  onClose: () => void;
  onCreated: (toast: string) => void;
};

export function CreateContractFromForecastModal({
  language,
  sku,
  defaultSupplier1Name,
  coverage,
  suppliers,
  onClose,
  onCreated,
}: CreateContractFromForecastModalProps) {
  const en = language === "en";

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.isActive).sort((a, b) => a.name.localeCompare(b.name)),
    [suppliers],
  );

  const [supplier1Name, setSupplier1Name] = useState(defaultSupplier1Name || "");
  const [supplier2Name, setSupplier2Name] = useState<string>("");

  const supplier1Meta = useMemo(
    () => activeSuppliers.find((s) => s.name.trim().toLowerCase() === supplier1Name.trim().toLowerCase()),
    [activeSuppliers, supplier1Name],
  );
  const supplier2Meta = useMemo(
    () => activeSuppliers.find((s) => s.name.trim().toLowerCase() === supplier2Name.trim().toLowerCase()),
    [activeSuppliers, supplier2Name],
  );

  const buyer1Code = resolveBuyerEntityCode(Boolean(supplier1Meta?.isDomesticContract));
  const buyer2Code = resolveBuyerEntityCode(Boolean(supplier2Meta?.isDomesticContract));

  const buyer1 = getContractBuyerEntity(buyer1Code);
  const buyer2 = getContractBuyerEntity(buyer2Code);

  const [batch, setBatch] = useState("");
  // Used as contract currency only for non-domestic suppliers (domestic always forces CNY).
  const [currency, setCurrency] = useState("USD");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [remark, setRemark] = useState("");
  const [remarkTemplate, setRemarkTemplate] = useState<"" | ContractRemarkTemplateId>("");
  const [serialCode, setSerialCode] = useState("");
  const [bluetoothId, setBluetoothId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initialQty1 = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of coverage.rows) m[r.forecastId] = r.remainingQty;
    return m;
  }, [coverage.rows]);
  const initialQty2 = useMemo(() => {
    const m: Record<string, number> = {};
    for (const r of coverage.rows) m[r.forecastId] = 0;
    return m;
  }, [coverage.rows]);

  const [qty1ByForecastId, setQty1ByForecastId] = useState<Record<string, number>>(initialQty1);
  const [qty2ByForecastId, setQty2ByForecastId] = useState<Record<string, number>>(initialQty2);

  const totalAllocQty1 = useMemo(
    () => Object.values(qty1ByForecastId).reduce((s, n) => s + Math.max(0, Math.trunc(n ?? 0)), 0),
    [qty1ByForecastId],
  );
  const totalAllocQty2 = useMemo(
    () => Object.values(qty2ByForecastId).reduce((s, n) => s + Math.max(0, Math.trunc(n ?? 0)), 0),
    [qty2ByForecastId],
  );
  const totalAlloc = totalAllocQty1 + totalAllocQty2;

  function clampTwoAlloc(remaining: number, nextQty1: number, currentQty2: number) {
    const q1 = Math.max(0, Math.trunc(nextQty1 ?? 0));
    const maxQ1 = Math.max(0, Math.trunc(remaining));
    const q1c = Math.min(maxQ1, q1);
    const q2c = Math.max(0, Math.trunc(currentQty2 ?? 0));
    // Ensure q1 + q2 <= remaining
    if (q1c + q2c <= maxQ1) return { q1: q1c, q2: q2c };
    const q2New = Math.max(0, maxQ1 - q1c);
    return { q1: q1c, q2: q2New };
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const s1 = supplier1Name.trim();
    const s2 = supplier2Name.trim();
    if (!s1) {
      setLoading(false);
      setError(en ? "Please select Supplier A" : "请选择乙方1（供应商A）");
      return;
    }

    const allocations: Array<{ forecastId: string; supplierName: string; quantity: number }> = [];
    for (const r of coverage.rows) {
      const remaining = r.remainingQty;
      const q1 = Math.max(0, Math.trunc(qty1ByForecastId[r.forecastId] ?? 0));
      const q2 = Math.max(0, Math.trunc(qty2ByForecastId[r.forecastId] ?? 0));
      const q1c = Math.min(remaining, q1);
      const q2c = Math.min(remaining - q1c, q2);
      if (q1c > 0) allocations.push({ forecastId: r.forecastId, supplierName: s1, quantity: q1c });
      if (s2 && q2c > 0) allocations.push({ forecastId: r.forecastId, supplierName: s2, quantity: q2c });
    }

    if (allocations.length === 0) {
      setLoading(false);
      setError(en ? "Allocations cannot be empty" : "签约数量不能为空");
      return;
    }

    const res = await fetch("/api/contracts/from-forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        allocations,
        batch,
        currency,
        remark,
        deliveryAddress,
        serialCode,
        bluetoothId,
        language,
      }),
    });

    const data = (await res.json().catch(() => ({}))) as { message?: string; toast?: string };
    setLoading(false);
    if (!res.ok) {
      setError(data.message || (en ? "Create failed" : "创建失败"));
      return;
    }
    onCreated(data.toast || (en ? "Contract(s) created." : "合同已创建。"));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-app-border bg-app-surface p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {en ? "Create contract from Forecast" : "从 Forecast 创建采购合同"}
            </h3>
            <p className="mt-1 text-sm text-app-muted">
              SKU: <span className="font-medium text-foreground">{sku}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-app-muted hover:bg-app-accent-soft"
          >
            {en ? "Close" : "关闭"}
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-app-border/80 bg-slate-50/80 p-3 text-sm dark:bg-slate-900/40">
            <p className="text-xs font-medium text-app-muted">{en ? "Buyer for Supplier A" : "甲方（乙方1）"}</p>
            <p className="font-medium text-foreground">{formatBuyerEntityLabel(buyer1Code, language)}</p>
            <p className="mt-1 text-xs text-app-muted">{buyer1.address}</p>
          </div>
          <div className="rounded-lg border border-app-border/80 bg-slate-50/80 p-3 text-sm dark:bg-slate-900/40">
            <p className="text-xs font-medium text-app-muted">{en ? "Buyer for Supplier B" : "甲方（乙方2）"}</p>
            <p className="font-medium text-foreground">{formatBuyerEntityLabel(buyer2Code, language)}</p>
            <p className="mt-1 text-xs text-app-muted">{buyer2.address}</p>
          </div>
        </div>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={ccLabel}>{en ? "Supplier A (乙方1)" : "乙方1（供应商A）"}</span>
                <select
                  value={supplier1Name}
                  onChange={(e) => {
                    const next = e.target.value;
                    setSupplier1Name(next);
                  }}
                  className={ccSelectSm}
                >
                  <option value="">{en ? "— Select —" : "— 请选择 —"}</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={ccLabel}>{en ? "Supplier B (乙方2)" : "乙方2（供应商B，可选）"}</span>
                <select
                  value={supplier2Name}
                  onChange={(e) => setSupplier2Name(e.target.value)}
                  className={ccSelectSm}
                >
                  <option value="">{en ? "— Not used —" : "— 不使用 —"}</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-2 text-xs text-app-muted">
              {en ? "Split remaining quantity between A and B." : "在乙方1/乙方2之间拆分待建数量。"}
            </p>
          </div>

          <div>
            <p className={ccLabel}>{en ? "Forecast lines (split qty)" : "Forecast 行（拆分数量）"}</p>
            <div className="mt-2 max-h-52 overflow-y-auto rounded-lg border border-app-border">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b border-app-border bg-app-surface/80 text-left text-app-muted">
                    <th className="px-2 py-1.5">PO</th>
                    <th className="px-2 py-1.5 text-right">BTO</th>
                    <th className="px-2 py-1.5 text-right">BTS</th>
                    <th className="px-2 py-1.5 text-right">{en ? "Remaining" : "待建"}</th>
                    <th className="px-2 py-1.5 text-right">{en ? "A Qty" : "乙方1数量"}</th>
                    <th className="px-2 py-1.5 text-right">{en ? "B Qty" : "乙方2数量"}</th>
                  </tr>
                </thead>
                <tbody>
                  {coverage.rows.map((r) => {
                    const remaining = r.remainingQty;
                    const q1 = qty1ByForecastId[r.forecastId] ?? 0;
                    const q2 = qty2ByForecastId[r.forecastId] ?? 0;
                    const maxQ2 = Math.max(0, Math.trunc(remaining - Math.trunc(q1 ?? 0)));
                    return (
                      <tr key={r.forecastId} className="border-b border-app-border/40">
                        <td className="px-2 py-1.5">{r.poNumber || "—"}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.buildToOrder}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{r.buildToStock}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-amber-700">{remaining}</td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            min={0}
                            max={remaining}
                            value={q1}
                            onChange={(e) => {
                              const nextQ1 = Number(e.target.value) || 0;
                              setQty1ByForecastId((prev) => ({ ...prev, [r.forecastId]: nextQ1 }));
                              // clamp q2 if needed
                              setQty2ByForecastId((prev) => {
                                const curQ2 = Number(prev[r.forecastId] ?? 0);
                                const clamped = clampTwoAlloc(remaining, nextQ1, curQ2);
                                return { ...prev, [r.forecastId]: clamped.q2 };
                              });
                            }}
                            className={`${ccInputSm} w-20 tabular-nums`}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            min={0}
                            max={supplier2Name.trim() ? maxQ2 : 0}
                            disabled={!supplier2Name.trim() || remaining <= 0}
                            value={supplier2Name.trim() ? q2 : 0}
                            onChange={(e) => {
                              const nextQ2 = Math.max(0, Number(e.target.value) || 0);
                              setQty2ByForecastId((prev) => ({
                                ...prev,
                                [r.forecastId]: Math.min(maxQ2, nextQ2),
                              }));
                            }}
                            className={`${ccInputSm} w-20 tabular-nums`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-xs text-app-muted">
              {en ? "This create total" : "本次合计"}: <span className="font-medium tabular-nums">{totalAlloc}</span>
              {" · "}
              {en ? "SKU remaining (approved/sent)" : "SKU 待建（已批准/已发送）"}:{" "}
              <span className="font-medium tabular-nums">{coverage.remainingQty}</span>
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={ccLabel}>Batch</span>
              <input value={batch} onChange={(e) => setBatch(e.target.value)} required className={ccInputSm} />
            </label>
            <label className="block">
              <span className={ccLabel}>Currency (for non-domestic)</span>
              <input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} required className={ccInputSm} />
            </label>
          </div>

          <label className="block">
            <span className={ccLabel}>{en ? "Delivery address" : "交货地址"}</span>
            <input
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              required
              className={`${ccInputMd} w-full`}
            />
          </label>

          <label className="block">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={ccLabel}>{en ? "Remark" : "备注"}</span>
              <select
                value={remarkTemplate}
                onChange={(e) => {
                  const id = e.target.value as "" | ContractRemarkTemplateId;
                  setRemarkTemplate(id);
                  if (id && CONTRACT_REMARK_TEMPLATES[id]) setRemark(CONTRACT_REMARK_TEMPLATES[id]);
                }}
                className={ccSelectSm}
              >
                <option value="">{en ? "— Custom —" : "— 自定义 —"}</option>
                <option value="template1">{en ? "Template 1" : "模板1"}</option>
              </select>
            </div>
            <textarea
              value={remark}
              onChange={(e) => {
                setRemark(e.target.value);
                setRemarkTemplate("");
              }}
              rows={remarkTemplate === "template1" ? 6 : 2}
              className="mt-1 w-full resize-y rounded-lg border border-app-border px-2 py-1.5 text-sm"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className={ccLabel}>{en ? "Serial code" : "序列号"}</span>
              <input value={serialCode} onChange={(e) => setSerialCode(e.target.value)} className={ccInputSm} />
            </label>
            <label className="block">
              <span className={ccLabel}>Bluetooth ID</span>
              <input value={bluetoothId} onChange={(e) => setBluetoothId(e.target.value)} className={ccInputSm} />
            </label>
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading || !batch.trim() || !deliveryAddress.trim() || totalAlloc <= 0}
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60"
            >
              {loading ? (en ? "Creating…" : "创建中…") : en ? "Create contract(s)" : "创建合同"}
            </button>
            <button type="button" onClick={onClose} className="rounded-lg border border-app-border px-4 py-2 text-sm">
              {en ? "Cancel" : "取消"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
