"use client";

import { useMemo, useState } from "react";
import { Paperclip, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import type { Language } from "@/lib/i18n";
import { formatForecastMonthLabel } from "@/lib/payment-schedule-matrix";
import type { FulfillmentGroup, FulfillmentShipmentEntry } from "@/lib/types";

type OrderFulfillmentsPanelProps = {
  language: Language;
  groups: FulfillmentGroup[];
  shipments: FulfillmentShipmentEntry[];
  shipToOptions: string[];
};

type RowFields = {
  estimatedReadyDate: string;
  soNumber: string;
  soUrl: string;
  soQuantity: string;
  freightMode: string;
  shipTo: string;
  etd: string;
  eta: string;
  trackingLink: string;
  deliveryStatus: string;
};

const EMPTY_FIELDS: RowFields = {
  estimatedReadyDate: "",
  soNumber: "",
  soUrl: "",
  soQuantity: "",
  freightMode: "",
  shipTo: "",
  etd: "",
  eta: "",
  trackingLink: "",
  deliveryStatus: "",
};

function fieldsFromShipment(s: FulfillmentShipmentEntry): RowFields {
  return {
    estimatedReadyDate: s.estimatedReadyDate ?? "",
    soNumber: s.soNumber,
    soUrl: s.soUrl,
    soQuantity: s.soQuantity > 0 ? String(s.soQuantity) : "",
    freightMode: s.freightMode,
    shipTo: s.shipTo,
    etd: s.etd ?? "",
    eta: s.eta ?? "",
    trackingLink: s.trackingLink,
    deliveryStatus: s.deliveryStatus,
  };
}

function groupKeyOf(g: { forecastMonth: string; forecastPoNumber: string; sku: string }): string {
  return `${g.forecastMonth}|${g.forecastPoNumber}|${g.sku}`;
}

/** Forecast PO prefix encodes the market: POA → APAC, POE → EU, POU → US. */
const REGION_PO_PREFIXES = [
  { value: "APAC", prefix: "POA" },
  { value: "EU", prefix: "POE" },
  { value: "US", prefix: "POU" },
] as const;

function matchesRegionFilter(forecastPoNumber: string, regionFilter: string): boolean {
  if (regionFilter === "all") return true;
  const entry = REGION_PO_PREFIXES.find((r) => r.value === regionFilter);
  if (!entry) return true;
  return forecastPoNumber.toUpperCase().startsWith(entry.prefix);
}

function regionOfPo(forecastPoNumber: string): "APAC" | "EU" | "US" | null {
  const po = forecastPoNumber.toUpperCase();
  for (const r of REGION_PO_PREFIXES) {
    if (po.startsWith(r.prefix)) return r.value;
  }
  return null;
}

/** Region-tinted chip for the Forecast PO number (POA/POE/POU). */
const PO_BADGE_BY_REGION: Record<string, string> = {
  APAC: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  EU: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-500/30",
  US: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
};

const PO_BADGE_DEFAULT =
  "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30";

/** Status dot color next to the Delivery status select. */
const STATUS_DOT: Record<string, string> = {
  Delivered: "bg-emerald-500",
  "In transit": "bg-sky-500",
  "Pending trigger SO": "bg-amber-400",
  "In preparation": "bg-slate-400",
};

function labels(language: Language) {
  const en = language === "en";
  return {
    title: en ? "Order fulfillments" : "订单履约",
    intro: en
      ? "Rows come from Forecast cash flow lines with created contracts (approved/sent). Auto fields stay in sync with Cash flow analysis; fill shipping fields per shipment."
      : "数据来自 Cash flow analysis 中已创建合同（已批准/已发送）的 forecast 行。自动字段与现金流分析保持同步，每次发货补充发运字段。",
    filterMonth: en ? "Forecast month" : "Forecast 月份",
    filterRegion: en ? "Region" : "区域",
    filterSku: "SKU",
    allMonths: en ? "All months" : "全部月份",
    allRegions: en ? "All regions" : "全部区域",
    allSkus: en ? "All SKUs" : "全部 SKU",
    forecastPo: en ? "Forecast PO number" : "Forecast PO 号",
    forecastMonth: en ? "Forecast month" : "Forecast 月份",
    sku: "SKU",
    mpBatch: en ? "MP batch" : "MP 批次",
    estimatedReady: en ? "Estimated production readiness" : "预计齐货日期",
    forecastQty: en ? "Forecast quantity" : "Forecast 数量",
    soNumber: en ? "SO Number" : "SO 号",
    soQty: en ? "SO Quantity" : "SO 数量",
    freightMode: en ? "Freight mode" : "运输方式",
    shipFrom: en ? "Ship from" : "发货地（CM）",
    shipTo: en ? "Ship to" : "收货地",
    etd: "ETD",
    eta: "ETA",
    trackingLink: en ? "Tracking link" : "跟踪链接",
    deliveryStatus: en ? "Delivery status" : "交付状态",
    balanceQty: en ? "Balance Qty" : "结余数量",
    actions: en ? "Actions" : "操作",
    save: en ? "Save" : "保存",
    addShipment: en ? "Add shipment" : "追加发货",
    deleteRow: en ? "Delete" : "删除",
    selectMode: en ? "Select…" : "选择…",
    selectStatus: en ? "Select status…" : "选择状态…",
    soUrlPh: en ? "Sales order URL (https://…)" : "Sales order 链接（https://…）",
    uploadFile: en ? "Attach file" : "上传附件",
    saveFirst: en ? "Save the row before attaching a file" : "先保存本行再上传附件",
    removeFile: en ? "Remove attachment" : "移除附件",
    empty: en
      ? "No forecast lines with created contracts yet. Create contracts in Supply Chain Management → Cash flow analysis first."
      : "暂无已创建合同的 forecast 行。请先在 Supply Chain Management → Cash flow analysis 创建合同。",
    saved: en ? "Saved." : "已保存。",
    deleted: en ? "Deleted." : "已删除。",
    saveFailed: en ? "Save failed." : "保存失败。",
    deleteFailed: en ? "Delete failed." : "删除失败。",
    uploadFailed: en ? "Upload failed." : "上传失败。",
    fileRemoved: en ? "Attachment removed." : "附件已移除。",
    freightSea: en ? "Sea" : "海运",
    freightAir: en ? "Air" : "空运",
    freightRail: en ? "Rail" : "铁路",
    freightRoad: en ? "Road" : "陆运",
  };
}

const inputCls =
  "w-full min-w-0 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm outline-none ring-app-accent transition duration-150 focus:ring-2";

const autoCellCls =
  "bg-slate-50/70 px-3 py-2.5 align-top text-sm text-foreground/90 dark:bg-transparent";

const thCls =
  "sticky top-0 z-10 border-b border-app-border bg-slate-50 px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-foreground/65 dark:bg-app-surface";

const chipCls =
  "inline-flex max-w-full items-center truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30";

const filterSelectCls =
  "app-control-sm mt-1 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm outline-none ring-app-accent transition duration-150 focus:ring-2";

export function OrderFulfillmentsPanel({
  language,
  groups,
  shipments,
  shipToOptions,
}: OrderFulfillmentsPanelProps) {
  const t = labels(language);
  const en = language === "en";

  const [localShipments, setLocalShipments] = useState<FulfillmentShipmentEntry[]>(shipments);
  const [drafts, setDrafts] = useState<{ tempId: string; groupKey: string }[]>([]);
  const [rowFields, setRowFields] = useState<Record<string, RowFields>>({});
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [skuFilter, setSkuFilter] = useState("all");

  const monthOptions = useMemo(
    () => [...new Set(groups.map((g) => g.forecastMonth))].sort(),
    [groups],
  );
  const skuOptions = useMemo(() => [...new Set(groups.map((g) => g.sku))].sort(), [groups]);

  const shipmentsByGroup = useMemo(() => {
    const map = new Map<string, FulfillmentShipmentEntry[]>();
    for (const s of localShipments) {
      const key = groupKeyOf(s);
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    return map;
  }, [localShipments]);

  type DisplayRow = {
    rowId: string;
    group: FulfillmentGroup;
    shipment: FulfillmentShipmentEntry | null;
    isFirstOfGroup: boolean;
  };

  const visibleGroups = useMemo(
    () =>
      groups.filter(
        (g) =>
          (monthFilter === "all" || g.forecastMonth === monthFilter) &&
          matchesRegionFilter(g.forecastPoNumber, regionFilter) &&
          (skuFilter === "all" || g.sku === skuFilter),
      ),
    [groups, monthFilter, regionFilter, skuFilter],
  );

  const rows = useMemo<DisplayRow[]>(() => {
    const out: DisplayRow[] = [];
    for (const g of visibleGroups) {
      const key = groupKeyOf(g);
      const saved = shipmentsByGroup.get(key) ?? [];
      const groupDrafts = drafts.filter((d) => d.groupKey === key);
      const rowsOfGroup: DisplayRow[] = [
        ...saved.map((s) => ({ rowId: s.id, group: g, shipment: s, isFirstOfGroup: false })),
        ...groupDrafts.map((d) => ({
          rowId: d.tempId,
          group: g,
          shipment: null,
          isFirstOfGroup: false,
        })),
      ];
      if (rowsOfGroup.length === 0) {
        rowsOfGroup.push({ rowId: `auto:${key}`, group: g, shipment: null, isFirstOfGroup: false });
      }
      rowsOfGroup[0].isFirstOfGroup = true;
      out.push(...rowsOfGroup);
    }
    return out;
  }, [visibleGroups, shipmentsByGroup, drafts]);

  const fieldsOf = (row: DisplayRow): RowFields =>
    rowFields[row.rowId] ?? (row.shipment ? fieldsFromShipment(row.shipment) : EMPTY_FIELDS);

  const setField = (row: DisplayRow, patch: Partial<RowFields>) => {
    setRowFields((prev) => ({ ...prev, [row.rowId]: { ...fieldsOf(row), ...patch } }));
  };

  /** Balance Qty per forecast month + SKU: Σ forecast qty − Σ SO qty (live values). */
  const balanceByMonthSku = useMemo(() => {
    const forecastSum = new Map<string, number>();
    for (const g of groups) {
      const key = `${g.forecastMonth}|${g.sku}`;
      forecastSum.set(key, (forecastSum.get(key) ?? 0) + g.forecastQty);
    }
    const soSum = new Map<string, number>();
    const addSo = (month: string, sku: string, value: string | number) => {
      const key = `${month}|${sku}`;
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) soSum.set(key, (soSum.get(key) ?? 0) + Math.trunc(n));
    };
    const counted = new Set<string>();
    for (const g of groups) {
      const key = groupKeyOf(g);
      const saved = shipmentsByGroup.get(key) ?? [];
      for (const s of saved) {
        counted.add(s.id);
        const f = rowFields[s.id];
        addSo(g.forecastMonth, g.sku, f ? f.soQuantity : s.soQuantity);
      }
      for (const d of drafts.filter((x) => x.groupKey === key)) {
        const f = rowFields[d.tempId];
        if (f) addSo(g.forecastMonth, g.sku, f.soQuantity);
      }
      const autoId = `auto:${key}`;
      const f = rowFields[autoId];
      if (f) addSo(g.forecastMonth, g.sku, f.soQuantity);
    }
    const out = new Map<string, number>();
    for (const [key, fq] of forecastSum) {
      out.set(key, fq - (soSum.get(key) ?? 0));
    }
    return out;
  }, [groups, shipmentsByGroup, drafts, rowFields]);

  async function saveRow(row: DisplayRow) {
    const f = fieldsOf(row);
    setBusyRowId(row.rowId);
    const payload = {
      estimatedReadyDate: f.estimatedReadyDate || null,
      soNumber: f.soNumber,
      soUrl: f.soUrl,
      soQuantity: Number(f.soQuantity || 0),
      freightMode: f.freightMode,
      shipTo: f.shipTo,
      etd: f.etd || null,
      eta: f.eta || null,
      trackingLink: f.trackingLink,
      deliveryStatus: f.deliveryStatus,
    };
    try {
      const isNew = row.shipment == null;
      const res = await fetch(
        isNew
          ? "/api/logistics-order-fulfillments"
          : `/api/logistics-order-fulfillments/${encodeURIComponent(row.rowId)}`,
        {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isNew
              ? {
                  ...payload,
                  forecastPoNumber: row.group.forecastPoNumber,
                  sku: row.group.sku,
                  forecastMonth: row.group.forecastMonth,
                }
              : payload,
          ),
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        entry?: FulfillmentShipmentEntry;
      };
      if (!res.ok || !data.entry) {
        toast.error(data.message || t.saveFailed);
        return;
      }
      const entry = data.entry;
      if (isNew) {
        setLocalShipments((prev) => [...prev, entry]);
        setDrafts((prev) => prev.filter((d) => d.tempId !== row.rowId));
        setRowFields((prev) => {
          const next = { ...prev };
          delete next[row.rowId];
          next[entry.id] = fieldsFromShipment(entry);
          return next;
        });
      } else {
        setLocalShipments((prev) => prev.map((s) => (s.id === entry.id ? entry : s)));
        setRowFields((prev) => ({ ...prev, [entry.id]: fieldsFromShipment(entry) }));
      }
      toast.success(`${t.saved} ${row.group.forecastPoNumber} · ${row.group.sku}`);
    } finally {
      setBusyRowId(null);
    }
  }

  async function deleteRow(row: DisplayRow) {
    if (row.shipment == null) {
      setDrafts((prev) => prev.filter((d) => d.tempId !== row.rowId));
      setRowFields((prev) => {
        const next = { ...prev };
        delete next[row.rowId];
        return next;
      });
      return;
    }
    setBusyRowId(row.rowId);
    try {
      const res = await fetch(
        `/api/logistics-order-fulfillments/${encodeURIComponent(row.rowId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(data.message || t.deleteFailed);
        return;
      }
      setLocalShipments((prev) => prev.filter((s) => s.id !== row.rowId));
      setRowFields((prev) => {
        const next = { ...prev };
        delete next[row.rowId];
        return next;
      });
      toast.success(t.deleted);
    } finally {
      setBusyRowId(null);
    }
  }

  function addShipment(row: DisplayRow) {
    const key = groupKeyOf(row.group);
    setDrafts((prev) => [
      ...prev,
      { tempId: `draft:${key}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`, groupKey: key },
    ]);
  }

  async function uploadFile(row: DisplayRow, file: File) {
    if (!row.shipment) return;
    setBusyRowId(row.rowId);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `/api/logistics-order-fulfillments/${encodeURIComponent(row.rowId)}/file`,
        {
          method: "POST",
          headers: { "accept-language": en ? "en" : "zh" },
          body: form,
        },
      );
      const data = (await res.json().catch(() => ({}))) as {
        message?: string;
        entry?: FulfillmentShipmentEntry;
      };
      if (!res.ok || !data.entry) {
        toast.error(data.message || t.uploadFailed);
        return;
      }
      const entry = data.entry;
      setLocalShipments((prev) => prev.map((s) => (s.id === entry.id ? entry : s)));
      toast.success(`${file.name}`);
    } finally {
      setBusyRowId(null);
    }
  }

  async function removeFile(row: DisplayRow) {
    if (!row.shipment?.attachment) return;
    setBusyRowId(row.rowId);
    try {
      const res = await fetch(
        `/api/logistics-order-fulfillments/${encodeURIComponent(row.rowId)}/file`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(data.message || t.deleteFailed);
        return;
      }
      setLocalShipments((prev) =>
        prev.map((s) => (s.id === row.rowId ? { ...s, attachment: null } : s)),
      );
      toast.success(t.fileRemoved);
    } finally {
      setBusyRowId(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground sm:text-lg">
              <span aria-hidden className="h-4 w-1 shrink-0 rounded-full bg-app-accent" />
              {t.title}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-foreground/70">{t.intro}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2 rounded-xl border border-app-border/70 bg-slate-50 px-3 py-2.5 dark:bg-transparent">
            <label className="shrink-0">
              <span className="block text-xs font-medium text-foreground/70">{t.filterMonth}</span>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className={filterSelectCls}
              >
                <option value="all">{t.allMonths}</option>
                {monthOptions.map((m) => (
                  <option key={m} value={m}>
                    {formatForecastMonthLabel(m, language)}
                  </option>
                ))}
              </select>
            </label>
            <label className="shrink-0">
              <span className="block text-xs font-medium text-foreground/70">{t.filterRegion}</span>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className={filterSelectCls}
              >
                <option value="all">{t.allRegions}</option>
                {REGION_PO_PREFIXES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.value}
                  </option>
                ))}
              </select>
            </label>
            <label className="shrink-0">
              <span className="block text-xs font-medium text-foreground/70">{t.filterSku}</span>
              <select
                value={skuFilter}
                onChange={(e) => setSkuFilter(e.target.value)}
                className={filterSelectCls}
              >
                <option value="all">{t.allSkus}</option>
                {skuOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {groups.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-app-border bg-slate-50 px-4 py-6 text-sm text-foreground/60 dark:bg-transparent">
            {t.empty}
          </p>
        ) : (
          <div className="app-table-shell mt-6 max-h-[72vh] overflow-auto">
            <table className="w-full min-w-[2280px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={thCls}>{t.forecastPo}</th>
                  <th className={thCls}>{t.forecastMonth}</th>
                  <th className={thCls}>{t.sku}</th>
                  <th className={thCls}>{t.mpBatch}</th>
                  <th className={thCls}>{t.estimatedReady}</th>
                  <th className={`${thCls} text-right`}>{t.forecastQty}</th>
                  <th className={thCls}>{t.soNumber}</th>
                  <th className={`${thCls} text-right`}>{t.soQty}</th>
                  <th className={thCls}>{t.freightMode}</th>
                  <th className={thCls}>{t.shipFrom}</th>
                  <th className={thCls}>{t.shipTo}</th>
                  <th className={thCls}>{t.etd}</th>
                  <th className={thCls}>{t.eta}</th>
                  <th className={thCls}>{t.trackingLink}</th>
                  <th className={thCls}>{t.deliveryStatus}</th>
                  <th className={`${thCls} text-right`}>{t.balanceQty}</th>
                  <th className={thCls}>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const f = fieldsOf(row);
                  const busy = busyRowId === row.rowId;
                  const balance =
                    balanceByMonthSku.get(`${row.group.forecastMonth}|${row.group.sku}`) ?? 0;
                  const region = regionOfPo(row.group.forecastPoNumber);
                  const poBadge = region ? PO_BADGE_BY_REGION[region] : PO_BADGE_DEFAULT;
                  return (
                    <tr
                      key={row.rowId}
                      className="group border-b border-app-border/60 align-top transition-colors duration-150 hover:bg-app-accent-soft/20"
                    >
                      <td className={`${autoCellCls} whitespace-nowrap`}>
                        {row.isFirstOfGroup ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${poBadge}`}
                            >
                              {row.group.forecastPoNumber}
                            </span>
                            {region ? (
                              <span className="text-[10px] font-medium uppercase tracking-wide text-foreground/45">
                                {region}
                              </span>
                            ) : null}
                          </span>
                        ) : (
                          <span
                            className="pl-1 text-xs text-foreground/40"
                            title={row.group.forecastPoNumber}
                          >
                            ↳ {row.group.forecastPoNumber}
                          </span>
                        )}
                      </td>
                      <td className={`${autoCellCls} whitespace-nowrap text-foreground/70`}>
                        {formatForecastMonthLabel(row.group.forecastMonth, language)}
                      </td>
                      <td className={`${autoCellCls} whitespace-nowrap font-medium`}>
                        {row.group.sku}
                      </td>
                      <td className={autoCellCls}>
                        {row.group.mpBatches.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {row.group.mpBatches.map((b) => (
                              <span key={b} className={chipCls} title={b}>
                                {b}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={f.estimatedReadyDate}
                          onChange={(e) => setField(row, { estimatedReadyDate: e.target.value })}
                          aria-label={t.estimatedReady}
                          className={`${inputCls} min-w-[9.5rem]`}
                        />
                      </td>
                      <td className={`${autoCellCls} text-right font-medium tabular-nums`}>
                        {row.group.forecastQty.toLocaleString()}
                      </td>
                      <td className="px-2 py-2">
                        <div className="min-w-[13rem] space-y-1.5">
                          <input
                            type="text"
                            value={f.soNumber}
                            onChange={(e) => setField(row, { soNumber: e.target.value })}
                            placeholder={t.soNumber}
                            aria-label={t.soNumber}
                            className={inputCls}
                          />
                          <input
                            type="url"
                            value={f.soUrl}
                            onChange={(e) => setField(row, { soUrl: e.target.value })}
                            placeholder={t.soUrlPh}
                            aria-label={t.soUrlPh}
                            className={`${inputCls} text-xs`}
                          />
                          <div className="flex items-center gap-2 text-xs">
                            {f.soUrl.trim().startsWith("http") ? (
                              <a
                                href={f.soUrl.trim()}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="text-app-accent underline-offset-2 hover:underline"
                              >
                                SO ↗
                              </a>
                            ) : null}
                            {row.shipment?.attachment ? (
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <a
                                  href={`/api/logistics-order-fulfillments/${encodeURIComponent(row.rowId)}/file`}
                                  className="inline-flex min-w-0 items-center gap-1 text-app-accent underline-offset-2 hover:underline"
                                  title={row.shipment.attachment.fileName}
                                >
                                  <Paperclip size={12} strokeWidth={1.5} className="shrink-0" />
                                  <span className="max-w-[9rem] truncate">
                                    {row.shipment.attachment.fileName}
                                  </span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => void removeFile(row)}
                                  disabled={busy}
                                  title={t.removeFile}
                                  aria-label={t.removeFile}
                                  className="rounded p-0.5 text-foreground/50 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                >
                                  <X size={12} strokeWidth={2} />
                                </button>
                              </span>
                            ) : (
                              <label
                                title={row.shipment ? t.uploadFile : t.saveFirst}
                                className={`inline-flex items-center gap-1 ${
                                  row.shipment
                                    ? "cursor-pointer text-foreground/60 hover:text-app-accent"
                                    : "cursor-not-allowed text-foreground/35"
                                }`}
                              >
                                <Paperclip size={12} strokeWidth={1.5} />
                                {t.uploadFile}
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.xls,.xlsx"
                                  disabled={!row.shipment || busy}
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    e.target.value = "";
                                    if (file) void uploadFile(row, file);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          min={0}
                          step={1}
                          inputMode="numeric"
                          value={f.soQuantity}
                          onChange={(e) => setField(row, { soQuantity: e.target.value })}
                          aria-label={t.soQty}
                          className={`${inputCls} app-control-num text-right tabular-nums`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={f.freightMode}
                          onChange={(e) => setField(row, { freightMode: e.target.value })}
                          aria-label={t.freightMode}
                          className={`${inputCls} min-w-[6.5rem]`}
                        >
                          <option value="">{t.selectMode}</option>
                          <option value="sea">{t.freightSea}</option>
                          <option value="air">{t.freightAir}</option>
                          <option value="rail">{t.freightRail}</option>
                          <option value="road">{t.freightRoad}</option>
                        </select>
                      </td>
                      <td className={autoCellCls}>
                        {row.group.shipFroms.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {row.group.shipFroms.map((s) => (
                              <span key={s} className={`${chipCls} max-w-[12rem]`} title={s}>
                                {s}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span className="text-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          list="of-ship-to-options"
                          value={f.shipTo}
                          onChange={(e) => setField(row, { shipTo: e.target.value })}
                          placeholder={t.shipTo}
                          aria-label={t.shipTo}
                          className={`${inputCls} min-w-[9rem]`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={f.etd}
                          onChange={(e) => setField(row, { etd: e.target.value })}
                          aria-label={t.etd}
                          className={`${inputCls} min-w-[9.5rem]`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="date"
                          value={f.eta}
                          onChange={(e) => setField(row, { eta: e.target.value })}
                          aria-label={t.eta}
                          className={`${inputCls} min-w-[9.5rem]`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={f.trackingLink}
                          onChange={(e) => setField(row, { trackingLink: e.target.value })}
                          placeholder="https://…"
                          aria-label={t.trackingLink}
                          className={`${inputCls} min-w-[9rem]`}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex min-w-[11.5rem] items-center gap-2">
                          <span
                            aria-hidden
                            className={`h-2 w-2 shrink-0 rounded-full transition-colors duration-150 ${
                              STATUS_DOT[f.deliveryStatus] ?? "bg-slate-200 dark:bg-slate-600"
                            }`}
                          />
                          <select
                            value={f.deliveryStatus}
                            onChange={(e) => setField(row, { deliveryStatus: e.target.value })}
                            aria-label={t.deliveryStatus}
                            className={inputCls}
                          >
                            <option value="">{t.selectStatus}</option>
                            <option value="In preparation">In preparation</option>
                            <option value="Pending trigger SO">Pending trigger SO</option>
                            <option value="In transit">In transit</option>
                            <option value="Delivered">Delivered</option>
                          </select>
                        </div>
                      </td>
                      <td className={`${autoCellCls} text-right`}>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ring-1 ring-inset ${
                            balance < 0
                              ? "bg-red-50 text-red-700 ring-red-200 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-500/30"
                              : balance === 0
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30"
                                : "bg-amber-50 text-amber-800 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30"
                          }`}
                        >
                          {balance.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex min-w-[15rem] flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void saveRow(row)}
                            className="app-button-primary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
                          >
                            <Save size={14} strokeWidth={1.5} />
                            {t.save}
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => addShipment(row)}
                            title={t.addShipment}
                            className="app-button-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
                          >
                            <Plus size={14} strokeWidth={1.5} />
                            {t.addShipment}
                          </button>
                          {(row.shipment != null || !row.rowId.startsWith("auto:")) && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void deleteRow(row)}
                              title={t.deleteRow}
                              aria-label={t.deleteRow}
                              className="inline-flex items-center rounded-lg border border-app-border px-2 py-1.5 text-xs text-foreground/60 transition duration-150 ease-out hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 size={14} strokeWidth={1.5} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <datalist id="of-ship-to-options">
              {shipToOptions.map((opt) => (
                <option key={opt} value={opt} />
              ))}
            </datalist>
          </div>
        )}
      </div>
    </div>
  );
}
