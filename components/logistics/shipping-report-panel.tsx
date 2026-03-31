"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { Language } from "@/lib/i18n";
import { SHIPPING_REPORT_SKU_OPTIONS } from "@/lib/shipping-report-skus";
import type { ShippingReportEntry } from "@/lib/types";

type Props = { entries: ShippingReportEntry[]; language: Language };
type Form = Omit<
  ShippingReportEntry,
  | "id"
  | "createdBy"
  | "createdAt"
  | "updatedAt"
  | "accessoryQuantity"
  | "paidByIgloo"
  | "paidByCustomer"
  | "sgdPaidByIgloo"
  | "sgdPaidByCustomer"
  | "usd"
> & {
  accessoryQuantity: string;
  paidByIgloo: string;
  paidByCustomer: string;
  sgdPaidByIgloo: string;
  sgdPaidByCustomer: string;
  usd: string;
};

const DEFAULT_FORM: Form = {
  sn: "",
  dateReleased: null,
  consigneeCompanyName: "",
  doGrnNumber: "",
  soCoReferenceNumber: "",
  podLink: "",
  sku: SHIPPING_REPORT_SKU_OPTIONS[0],
  accessoryQuantity: "",
  accessoryNumber: "",
  requestBy: "",
  poNumber: "",
  btoBts: "",
  purpose: "",
  shipFrom: "",
  shipTo: "",
  shipToRegion: "",
  shippingMode: "",
  shippingMethod: "",
  trackingNumber: "",
  costCentre: "",
  paidByIgloo: "",
  paidByCustomer: "",
  sgdPaidByIgloo: "",
  sgdPaidByCustomer: "",
  usd: "",
  productSerialNo: "",
  remarks: "",
};

export function ShippingReportPanel({ entries, language }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const en = language === "en";

  const columns = useMemo(
    () => [
      "SN",
      "Date Released",
      "Consignee's company name",
      "DO / GRN Number",
      "SO, CO / Reference Number",
      "POD Link (SO only)",
      "SKU",
      "Accessory Quantity",
      "Accessory #",
      "Request By",
      "P/O Number",
      "BTO / BTS",
      "Purpose",
      "Ship From",
      "Ship To",
      "Ship To Region",
      "Shipping Mode",
      "Shipping Method",
      "Tracking number",
      "Cost Centre",
      "Paid by Igloo",
      "Paid by Customer",
      "SGD Paid by Igloo",
      "SGD Paid by Customer",
      "USD",
      "Product Serial No.",
      "Remarks",
    ],
    [],
  );

  function resetForm() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setMessage("");
  }

  function startEdit(e: ShippingReportEntry) {
    setEditingId(e.id);
    setForm({
      sn: e.sn,
      dateReleased: e.dateReleased,
      consigneeCompanyName: e.consigneeCompanyName,
      doGrnNumber: e.doGrnNumber,
      soCoReferenceNumber: e.soCoReferenceNumber,
      podLink: e.podLink,
      sku: e.sku,
      accessoryQuantity: e.accessoryQuantity === 0 ? "" : String(e.accessoryQuantity),
      accessoryNumber: e.accessoryNumber,
      requestBy: e.requestBy,
      poNumber: e.poNumber,
      btoBts: e.btoBts,
      purpose: e.purpose,
      shipFrom: e.shipFrom,
      shipTo: e.shipTo,
      shipToRegion: e.shipToRegion,
      shippingMode: e.shippingMode,
      shippingMethod: e.shippingMethod,
      trackingNumber: e.trackingNumber,
      costCentre: e.costCentre,
      paidByIgloo: e.paidByIgloo === 0 ? "" : String(e.paidByIgloo),
      paidByCustomer: e.paidByCustomer === 0 ? "" : String(e.paidByCustomer),
      sgdPaidByIgloo: e.sgdPaidByIgloo === 0 ? "" : String(e.sgdPaidByIgloo),
      sgdPaidByCustomer: e.sgdPaidByCustomer === 0 ? "" : String(e.sgdPaidByCustomer),
      usd: e.usd === 0 ? "" : String(e.usd),
      productSerialNo: e.productSerialNo,
      remarks: e.remarks,
    });
    setMessage("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const accessoryQuantity =
      form.accessoryQuantity.trim() === "" ? 0 : Number(form.accessoryQuantity);
    const paidByIgloo = form.paidByIgloo.trim() === "" ? 0 : Number(form.paidByIgloo);
    const paidByCustomer = form.paidByCustomer.trim() === "" ? 0 : Number(form.paidByCustomer);
    const sgdPaidByIgloo = form.sgdPaidByIgloo.trim() === "" ? 0 : Number(form.sgdPaidByIgloo);
    const sgdPaidByCustomer =
      form.sgdPaidByCustomer.trim() === "" ? 0 : Number(form.sgdPaidByCustomer);
    const usd = form.usd.trim() === "" ? 0 : Number(form.usd);
    if (
      [accessoryQuantity, paidByIgloo, paidByCustomer, sgdPaidByIgloo, sgdPaidByCustomer, usd].some(
        (n) => Number.isNaN(n) || n < 0,
      )
    ) {
      setLoading(false);
      return setMessage(en ? "Invalid numeric fields" : "数值字段不合法");
    }
    const response = await fetch(
      editingId ? `/api/logistics-shipping-reports/${encodeURIComponent(editingId)}` : "/api/logistics-shipping-reports",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          accessoryQuantity,
          paidByIgloo,
          paidByCustomer,
          sgdPaidByIgloo,
          sgdPaidByCustomer,
          usd,
        }),
      },
    );
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    setLoading(false);
    if (!response.ok) return setMessage(data.message || "Request failed");
    resetForm();
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm(en ? "Delete this shipping report?" : "确认删除该 shipping report？")) return;
    const response = await fetch(`/api/logistics-shipping-reports/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) return setMessage("Delete failed");
    if (editingId === id) resetForm();
    router.refresh();
  }

  function showNum(value: number) {
    return value === 0 ? "-" : value;
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">
          {en ? "Shipping Report" : "Shipping Report"}
        </h3>
        <form className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4" onSubmit={onSubmit}>
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="SN *" value={form.sn} onChange={(e) => setForm((f) => ({ ...f, sn: e.target.value }))} required />
          <input type="date" className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.dateReleased ?? ""} onChange={(e) => setForm((f) => ({ ...f, dateReleased: e.target.value || null }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Consignee's company name" value={form.consigneeCompanyName} onChange={(e) => setForm((f) => ({ ...f, consigneeCompanyName: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="DO / GRN Number" value={form.doGrnNumber} onChange={(e) => setForm((f) => ({ ...f, doGrnNumber: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="SO, CO / Reference Number" value={form.soCoReferenceNumber} onChange={(e) => setForm((f) => ({ ...f, soCoReferenceNumber: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="POD Link (SO only)" value={form.podLink} onChange={(e) => setForm((f) => ({ ...f, podLink: e.target.value }))} />
          <select className="rounded-lg border border-app-border px-3 py-2 text-sm" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}>
            {SHIPPING_REPORT_SKU_OPTIONS.map((sku) => (
              <option key={sku} value={sku}>
                {sku}
              </option>
            ))}
          </select>
          <input type="number" min={0} className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Accessory Quantity (optional)" value={form.accessoryQuantity} onChange={(e) => setForm((f) => ({ ...f, accessoryQuantity: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Accessory #" value={form.accessoryNumber} onChange={(e) => setForm((f) => ({ ...f, accessoryNumber: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Request By" value={form.requestBy} onChange={(e) => setForm((f) => ({ ...f, requestBy: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="P/O Number" value={form.poNumber} onChange={(e) => setForm((f) => ({ ...f, poNumber: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="BTO / BTS" value={form.btoBts} onChange={(e) => setForm((f) => ({ ...f, btoBts: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Purpose" value={form.purpose} onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Ship From" value={form.shipFrom} onChange={(e) => setForm((f) => ({ ...f, shipFrom: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Ship To" value={form.shipTo} onChange={(e) => setForm((f) => ({ ...f, shipTo: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Ship To Region" value={form.shipToRegion} onChange={(e) => setForm((f) => ({ ...f, shipToRegion: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Shipping Mode" value={form.shippingMode} onChange={(e) => setForm((f) => ({ ...f, shippingMode: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Shipping Method" value={form.shippingMethod} onChange={(e) => setForm((f) => ({ ...f, shippingMethod: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Tracking number" value={form.trackingNumber} onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Cost Centre" value={form.costCentre} onChange={(e) => setForm((f) => ({ ...f, costCentre: e.target.value }))} />
          <input type="number" min={0} step="0.01" className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Paid by Igloo (optional)" value={form.paidByIgloo} onChange={(e) => setForm((f) => ({ ...f, paidByIgloo: e.target.value }))} />
          <input type="number" min={0} step="0.01" className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Paid by Customer (optional)" value={form.paidByCustomer} onChange={(e) => setForm((f) => ({ ...f, paidByCustomer: e.target.value }))} />
          <input type="number" min={0} step="0.01" className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="SGD Paid by Igloo (optional)" value={form.sgdPaidByIgloo} onChange={(e) => setForm((f) => ({ ...f, sgdPaidByIgloo: e.target.value }))} />
          <input type="number" min={0} step="0.01" className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="SGD Paid by Customer (optional)" value={form.sgdPaidByCustomer} onChange={(e) => setForm((f) => ({ ...f, sgdPaidByCustomer: e.target.value }))} />
          <input type="number" min={0} step="0.01" className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="USD (optional)" value={form.usd} onChange={(e) => setForm((f) => ({ ...f, usd: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm" placeholder="Product Serial No." value={form.productSerialNo} onChange={(e) => setForm((f) => ({ ...f, productSerialNo: e.target.value }))} />
          <input className="rounded-lg border border-app-border px-3 py-2 text-sm lg:col-span-4" placeholder="Remarks" value={form.remarks} onChange={(e) => setForm((f) => ({ ...f, remarks: e.target.value }))} />
          <div className="lg:col-span-4 flex gap-2">
            <button type="submit" disabled={loading} className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover disabled:opacity-60">
              {editingId ? (en ? "Save" : "保存") : en ? "Create" : "创建"}
            </button>
            {editingId ? <button type="button" onClick={resetForm} className="rounded-lg border border-app-border px-4 py-2 text-sm">{en ? "Cancel" : "取消"}</button> : null}
          </div>
        </form>
        {message ? <p className="mt-2 text-sm text-red-600">{message}</p> : null}
      </section>
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[3200px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border/90 text-left text-zinc-600">
                {columns.map((h) => (
                  <th key={h} className="px-2 py-2">{h}</th>
                ))}
                <th className="px-2 py-2">{en ? "Actions" : "操作"}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-2 py-6 text-center text-app-muted">
                    {en ? "No shipping reports yet." : "暂无 shipping report 数据。"}
                  </td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-b border-app-border/35">
                    <td className="px-2 py-2">{e.sn}</td>
                    <td className="px-2 py-2">{e.dateReleased || "-"}</td>
                    <td className="px-2 py-2">{e.consigneeCompanyName || "-"}</td>
                    <td className="px-2 py-2">{e.doGrnNumber || "-"}</td>
                    <td className="px-2 py-2">{e.soCoReferenceNumber || "-"}</td>
                    <td className="px-2 py-2">{e.podLink || "-"}</td>
                    <td className="px-2 py-2">{e.sku}</td>
                    <td className="px-2 py-2">{showNum(e.accessoryQuantity)}</td>
                    <td className="px-2 py-2">{e.accessoryNumber || "-"}</td>
                    <td className="px-2 py-2">{e.requestBy || "-"}</td>
                    <td className="px-2 py-2">{e.poNumber || "-"}</td>
                    <td className="px-2 py-2">{e.btoBts || "-"}</td>
                    <td className="px-2 py-2">{e.purpose || "-"}</td>
                    <td className="px-2 py-2">{e.shipFrom || "-"}</td>
                    <td className="px-2 py-2">{e.shipTo || "-"}</td>
                    <td className="px-2 py-2">{e.shipToRegion || "-"}</td>
                    <td className="px-2 py-2">{e.shippingMode || "-"}</td>
                    <td className="px-2 py-2">{e.shippingMethod || "-"}</td>
                    <td className="px-2 py-2">{e.trackingNumber || "-"}</td>
                    <td className="px-2 py-2">{e.costCentre || "-"}</td>
                    <td className="px-2 py-2">{showNum(e.paidByIgloo)}</td>
                    <td className="px-2 py-2">{showNum(e.paidByCustomer)}</td>
                    <td className="px-2 py-2">{showNum(e.sgdPaidByIgloo)}</td>
                    <td className="px-2 py-2">{showNum(e.sgdPaidByCustomer)}</td>
                    <td className="px-2 py-2">{showNum(e.usd)}</td>
                    <td className="px-2 py-2">{e.productSerialNo || "-"}</td>
                    <td className="px-2 py-2">{e.remarks || "-"}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEdit(e)} className="rounded border border-app-border px-2 py-1 text-xs">{en ? "Edit" : "编辑"}</button>
                        <button type="button" onClick={() => onDelete(e.id)} className="rounded border border-red-300 px-2 py-1 text-xs text-red-700">{en ? "Delete" : "删除"}</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
