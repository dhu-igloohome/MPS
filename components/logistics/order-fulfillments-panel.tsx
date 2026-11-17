"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Package,
  Paperclip,
  Plus,
  Save,
  Search,
  Trash2,
  Truck,
  Wand2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import type { Language } from "@/lib/i18n";
import { formatForecastMonthLabel } from "@/lib/payment-schedule-matrix";
import { type FulfillmentIssue, shipmentIssues } from "@/lib/fulfillment-attention";
import { suggestShipmentFields } from "@/lib/fulfillment-prefill";
import {
  OPS_DEPARTMENT,
  SHIPMENT_REGIONS,
  suggestRegionFromShipTo,
} from "@/lib/fulfillment-region";
import type { FulfillmentGroup, FulfillmentShipmentEntry, Region } from "@/lib/types";

type OrderFulfillmentsPanelProps = {
  language: Language;
  groups: FulfillmentGroup[];
  shipments: FulfillmentShipmentEntry[];
  shipToOptions: string[];
  /** Server's today (YYYY-MM-DD, UTC) so "ETA passed" agrees between server render and hydration. */
  todayIso: string;
};

type ShipmentView = "attention" | "active" | "all";

type RowFields = {
  estimatedReadyDate: string;
  soNumber: string;
  soUrl: string;
  soQuantity: string;
  freightMode: string;
  shipTo: string;
  /** Destination region; only used for groups parked under "OPS Department" (shared buffer). */
  region: string;
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
  region: "",
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
    region: s.region,
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

/**
 * High-contrast, filled badge (solid color + white text + icon, not just a hue) so status is
 * readable at a glance from across the room — a small colored dot isn't distinguishable at that
 * distance, especially by color alone. Icon shape is a second, colorblind-safe cue alongside color.
 */
const STATUS_BADGE: Record<string, string> = {
  Delivered: "bg-emerald-600 text-white",
  "In transit": "bg-sky-600 text-white",
  "Pending trigger SO": "bg-amber-500 text-slate-950",
  "In preparation": "bg-slate-500 text-white",
};
const STATUS_BADGE_EMPTY =
  "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-300 dark:bg-slate-700/40 dark:text-slate-500 dark:ring-slate-600";
const STATUS_ICON: Record<string, typeof CheckCircle2> = {
  Delivered: CheckCircle2,
  "In transit": Truck,
  "Pending trigger SO": Clock,
  "In preparation": Package,
};

function labels(language: Language) {
  const en = language === "en";
  return {
    title: en ? "Order fulfillments" : "订单履约",
    introLabel: en ? "About this module" : "模块说明",
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
    soFilterPlaceholder: en ? "Filter by SO Number" : "按 SO 号筛选",
    soFilterClear: en ? "Clear SO Number filter" : "清除 SO 号筛选",
    soSearchAll: en ? "Searching all statuses (including delivered)" : "正在搜索全部状态（含已送达）",
    soFilterNoMatch: en ? "No rows match this SO Number." : "没有匹配该 SO 号的行。",
    soFilterCount: (n: number) => (en ? `${n} row${n === 1 ? "" : "s"}` : `${n} 行`),
    soQty: en ? "SO Quantity" : "SO 数量",
    freightMode: en ? "Freight mode" : "运输方式",
    shipFrom: en ? "Ship from" : "发货地（CM）",
    shipTo: en ? "Ship to" : "收货地",
    etd: "ETD",
    eta: "ETA",
    trackingLink: en ? "Tracking link" : "跟踪链接",
    openTracking: en ? "Open tracking page" : "打开物流跟踪页面",
    viewLabel: en ? "Show" : "显示",
    viewAttention: en ? "Needs attention" : "需要处理",
    viewActive: en ? "In progress" : "进行中",
    viewAll: en ? "All" : "全部",
    viewAttentionHint: en
      ? "Shipments that still need something: ETA passed, or missing ETA / tracking link / SO number / ship-to / status."
      : "还有事要做的货运：ETA 已过，或缺 ETA / 跟踪链接 / SO 号 / 收货地 / 交付状态。",
    viewActiveHint: en
      ? "Everything not delivered yet, including forecasts with no shipment recorded."
      : "所有还没送达的，包括还没录过货运的 forecast。",
    attentionNone: en ? "Nothing needs attention right now." : "目前没有需要处理的货运。",
    viewEmpty: en ? "No rows in this view." : "当前视图没有数据。",
    issueEtaPassed: (d: number) => (en ? `ETA passed ${d}d` : `ETA 已过 ${d} 天`),
    issueNoEta: en ? "No ETA" : "缺 ETA",
    issueNoTracking: en ? "No tracking link" : "缺跟踪链接",
    issueNoSo: en ? "No SO number" : "缺 SO 号",
    issueNoShipTo: en ? "No ship-to" : "缺收货地",
    issueNoStatus: en ? "No status" : "缺交付状态",
    fillFromContract: en ? "Fill from contract" : "从合同带出",
    fillFromContractHint: en
      ? "Fill the empty fields from the contract and earlier shipments: remaining quantity, ready date, ship to, freight mode, status. Nothing you already typed is changed."
      : "用合同和已有货运把空着的字段填上：剩余数量、备货完成日、收货地、运输方式、状态。你已经填好的不会被改动。",
    fillDone: en ? "Filled from contract:" : "已从合同带出：",
    fillCheck: en ? "Check, then Save." : "请核对后保存。",
    fillNothing: en
      ? "Nothing to fill — those fields already have values."
      : "没有可带出的内容：相关字段都已有值。",
    stillMissing: en ? "Still open:" : "仍待处理：",
    movedOut: en ? "This row left the current view." : "该行已移出当前视图。",
    deliveryStatus: en ? "Delivery status" : "交付状态",
    statusNotSet: en ? "Not set" : "未设置",
    region: en ? "Region" : "地区",
    regionSelect: en ? "Region…" : "选择地区…",
    regionRequired: en
      ? "Pick the destination region for this shipment (it draws from the shared OPS Department buffer)."
      : "请选择这笔货运发往的地区（它消耗的是共用的 OPS Department Buffer）。",
    regionNone: en ? "no region" : "未选地区",
    bufferLeft: en ? "Left" : "剩余",
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
  "sticky top-0 z-10 border-b border-app-border bg-slate-50 px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-foreground/65 dark:bg-app-surface";

/**
 * First three columns (Forecast PO / Forecast month / SKU + status) stay pinned to the left while
 * scrolling sideways, so you always know which row you're editing. Only at xl+ widths: on narrower
 * screens the pinned block would eat most of the visible table.
 */
const PIN_PO_W = "w-[11.5rem] min-w-[11.5rem] max-w-[11.5rem]";
const PIN_MONTH_W = "w-[4.75rem] min-w-[4.75rem] max-w-[4.75rem]";
const PIN_SKU_W = "w-[8.5rem] min-w-[8.5rem] max-w-[8.5rem]";
const PIN_PO_X = "xl:sticky xl:left-0";
const PIN_MONTH_X = "xl:sticky xl:left-[11.5rem]";
const PIN_SKU_X =
  "xl:sticky xl:left-[16.25rem] xl:border-r xl:border-app-border xl:shadow-[3px_0_5px_-3px_rgba(15,23,42,0.18)]";
const pinnedCellCls =
  "px-3 py-2.5 align-top text-sm text-foreground/90 bg-slate-50 dark:bg-app-surface xl:z-[5]";

const chipCls =
  "inline-flex max-w-full items-center truncate rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-500/10 dark:text-slate-300 dark:ring-slate-500/30";

const filterSelectCls =
  "app-control-sm mt-1 rounded-lg border border-app-border bg-app-surface px-2 py-1.5 text-sm outline-none ring-app-accent transition duration-150 focus:ring-2";

export function OrderFulfillmentsPanel({
  language,
  groups,
  shipments,
  shipToOptions,
  todayIso,
}: OrderFulfillmentsPanelProps) {
  const t = labels(language);
  const en = language === "en";
  // Default to everything: finance reconciles against ALL shipments weekly, so nothing may be hidden
  // until someone picks a narrower tab on purpose.
  const [view, setView] = useState<ShipmentView>("all");

  const [localShipments, setLocalShipments] = useState<FulfillmentShipmentEntry[]>(shipments);
  const [drafts, setDrafts] = useState<{ tempId: string; groupKey: string }[]>([]);
  const [rowFields, setRowFields] = useState<Record<string, RowFields>>({});
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState("all");
  const [regionFilter, setRegionFilter] = useState("all");
  const [skuFilter, setSkuFilter] = useState("all");
  const [soQuery, setSoQuery] = useState("");

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

  const soFilter = soQuery.trim().toLowerCase();
  // Typing an SO number searches EVERY status. Otherwise a delivered shipment (hidden by the default
  // "In progress" tab) looked like it had vanished: "no rows match this SO Number".
  const effectiveView: ShipmentView = soFilter ? "all" : view;

  const soOptions = useMemo(
    () => [...new Set(localShipments.map((s) => s.soNumber.trim()).filter(Boolean))].sort(),
    [localShipments],
  );

  const matchesView = (s: FulfillmentShipmentEntry, v: ShipmentView) =>
    v === "all" ||
    (v === "active" ? s.deliveryStatus !== "Delivered" : shipmentIssues(s, todayIso).length > 0);

  const { rows, viewCounts } = useMemo(() => {
    const out: DisplayRow[] = [];
    const counts = { attention: 0, active: 0, all: 0 };
    for (const g of visibleGroups) {
      const key = groupKeyOf(g);
      let saved = shipmentsByGroup.get(key) ?? [];
      // Matches the SAVED SO number, not a half-typed edit, so a row doesn't vanish mid-typing.
      // A group with no matching saved row is hidden; its draft rows are kept alongside matches.
      if (soFilter) {
        saved = saved.filter((s) => s.soNumber.toLowerCase().includes(soFilter));
        if (saved.length === 0) continue;
      }
      const groupDrafts = drafts.filter((d) => d.groupKey === key);
      // Same rule for the view tabs: judged on SAVED values so a row doesn't jump while you type.
      for (const s of saved) {
        counts.all++;
        if (matchesView(s, "active")) counts.active++;
        if (matchesView(s, "attention")) counts.attention++;
      }
      const shownSaved = saved.filter((s) => matchesView(s, effectiveView));
      let rowsOfGroup: DisplayRow[];
      if (saved.length === 0 && groupDrafts.length === 0) {
        // Nothing shipped yet for this forecast group: counts as in progress, never "needs attention".
        counts.all++;
        counts.active++;
        if (effectiveView === "attention") continue;
        rowsOfGroup = [{ rowId: `auto:${key}`, group: g, shipment: null, isFirstOfGroup: false }];
      } else {
        if (shownSaved.length === 0 && saved.length > 0) continue;
        rowsOfGroup = [
          ...shownSaved.map((s) => ({ rowId: s.id, group: g, shipment: s, isFirstOfGroup: false })),
          ...groupDrafts.map((d) => ({
            rowId: d.tempId,
            group: g,
            shipment: null,
            isFirstOfGroup: false,
          })),
        ];
      }
      rowsOfGroup[0].isFirstOfGroup = true;
      out.push(...rowsOfGroup);
    }
    return { rows: out, viewCounts: counts };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- matchesView only reads todayIso
  }, [visibleGroups, shipmentsByGroup, drafts, soFilter, effectiveView, todayIso]);

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

  const issueLabel = (i: FulfillmentIssue): string => {
    switch (i.code) {
      case "etaPassed":
        return t.issueEtaPassed(i.days ?? 0);
      case "noEta":
        return t.issueNoEta;
      case "noTracking":
        return t.issueNoTracking;
      case "noSo":
        return t.issueNoSo;
      case "noShipTo":
        return t.issueNoShipTo;
      case "noStatus":
        return t.issueNoStatus;
    }
  };

  /** Shared buffer pool: no region of its own, so each shipment declares where it is going. */
  const isBufferPool = (g: FulfillmentGroup) => g.region === OPS_DEPARTMENT;

  /** Per-region draw-down of a shared buffer group, from live (possibly unsaved) values. */
  const bufferUsage = (g: FulfillmentGroup) => {
    const key = groupKeyOf(g);
    const byRegion = new Map<string, number>();
    let used = 0;
    const add = (region: string, qty: string | number) => {
      const n = Math.trunc(Number(qty));
      if (!Number.isFinite(n) || n <= 0) return;
      used += n;
      byRegion.set(region, (byRegion.get(region) ?? 0) + n);
    };
    for (const s of shipmentsByGroup.get(key) ?? []) {
      const f = rowFields[s.id];
      add(f ? f.region : s.region, f ? f.soQuantity : s.soQuantity);
    }
    for (const d of drafts) {
      if (d.groupKey !== key) continue;
      const f = rowFields[d.tempId];
      if (f) add(f.region, f.soQuantity);
    }
    const auto = rowFields[`auto:${key}`];
    if (auto) add(auto.region, auto.soQuantity);
    return { byRegion, left: g.forecastQty - used };
  };

  async function saveRow(row: DisplayRow) {
    const f = fieldsOf(row);
    const needsRegion = isBufferPool(row.group);
    if (needsRegion && !f.region) {
      toast.error(t.regionRequired);
      return;
    }
    setBusyRowId(row.rowId);
    const payload = {
      estimatedReadyDate: f.estimatedReadyDate || null,
      soNumber: f.soNumber,
      soUrl: f.soUrl,
      soQuantity: Number(f.soQuantity || 0),
      freightMode: f.freightMode,
      shipTo: f.shipTo,
      region: needsRegion ? f.region : "",
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
      const label = `${t.saved} ${row.group.forecastPoNumber} · ${row.group.sku}`;
      const leftOpen = shipmentIssues(entry, todayIso);
      const note = matchesView(entry, view) ? "" : ` ${t.movedOut}`;
      if (leftOpen.length > 0) {
        toast.warning(`${label}${note} ${t.stillMissing} ${leftOpen.map(issueLabel).join(", ")}`);
      } else {
        toast.success(`${label}${note}`);
      }
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

  /** What the group's other shipments (saved or being typed) already say, for prefilling a new one. */
  const siblingsOf = (g: FulfillmentGroup, excludeRowId: string) => {
    const key = groupKeyOf(g);
    const out: { soQuantity: number; shipTo: string; freightMode: string; region: Region | "" }[] = [];
    for (const s of shipmentsByGroup.get(key) ?? []) {
      if (s.id === excludeRowId) continue;
      const f = rowFields[s.id];
      out.push({
        soQuantity: Number(f ? f.soQuantity : s.soQuantity),
        shipTo: f ? f.shipTo : s.shipTo,
        freightMode: f ? f.freightMode : s.freightMode,
        region: (f ? f.region : s.region) as Region | "",
      });
    }
    for (const d of drafts) {
      if (d.groupKey !== key || d.tempId === excludeRowId) continue;
      const f = rowFields[d.tempId];
      if (f) {
        out.push({
          soQuantity: Number(f.soQuantity),
          shipTo: f.shipTo,
          freightMode: f.freightMode,
          region: f.region as Region | "",
        });
      }
    }
    return out;
  };

  const FILL_FIELDS = [
    ["soQuantity", t.soQty],
    ["estimatedReadyDate", t.estimatedReady],
    ["shipTo", t.shipTo],
    ["freightMode", t.freightMode],
    ["region", t.region],
    ["deliveryStatus", t.deliveryStatus],
  ] as const;

  /** Fills only fields that are still empty, so nothing the user typed is ever overwritten. */
  function fillFromContract(row: DisplayRow) {
    const suggestion = suggestShipmentFields(row.group, siblingsOf(row.group, row.rowId));
    const current = fieldsOf(row);
    const patch: Partial<RowFields> = {};
    const filled: string[] = [];
    for (const [key, label] of FILL_FIELDS) {
      const value = suggestion[key];
      if (value && !current[key]) {
        patch[key] = value;
        filled.push(label);
      }
    }
    if (filled.length === 0) {
      toast.info(t.fillNothing);
      return;
    }
    setField(row, patch);
    toast.success(`${t.fillDone} ${filled.join(", ")}. ${t.fillCheck}`);
  }

  function addShipment(row: DisplayRow) {
    const key = groupKeyOf(row.group);
    const tempId = `draft:${key}:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
    const suggestion = suggestShipmentFields(row.group, siblingsOf(row.group, tempId));
    setDrafts((prev) => [...prev, { tempId, groupKey: key }]);
    setRowFields((prev) => ({
      ...prev,
      [tempId]: {
        ...EMPTY_FIELDS,
        soQuantity: suggestion.soQuantity ?? "",
        estimatedReadyDate: suggestion.estimatedReadyDate ?? "",
        shipTo: suggestion.shipTo ?? "",
        freightMode: suggestion.freightMode ?? "",
        region: suggestion.region ?? "",
        deliveryStatus: suggestion.deliveryStatus,
      },
    }));
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
            <details className="mt-1.5 text-xs text-app-muted">
              <summary className="cursor-pointer select-none font-medium text-foreground/70">
                {t.introLabel}
              </summary>
              <p className="mt-1 max-w-3xl text-sm leading-relaxed text-foreground/70">{t.intro}</p>
            </details>
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
            <div className="shrink-0">
              <label htmlFor="so-filter-input" className="block text-xs font-medium text-foreground/70">
                {t.soNumber}
                {soFilter ? (
                  <span
                    className={`ml-1.5 font-semibold ${rows.length === 0 ? "text-red-600" : "text-app-accent"}`}
                  >
                    {t.soFilterCount(rows.length)}
                  </span>
                ) : null}
              </label>
              <div className="relative mt-1">
                <Search
                  size={14}
                  strokeWidth={2}
                  aria-hidden
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-foreground/45"
                />
                <input
                  id="so-filter-input"
                  type="text"
                  list="so-filter-options"
                  value={soQuery}
                  onChange={(e) => setSoQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSoQuery("");
                  }}
                  placeholder={t.soFilterPlaceholder}
                  autoComplete="off"
                  className="w-56 rounded-lg border border-app-border bg-app-surface py-1.5 pl-7 pr-7 text-sm outline-none ring-app-accent transition duration-150 focus:ring-2"
                />
                {soQuery ? (
                  <button
                    type="button"
                    onClick={() => setSoQuery("")}
                    aria-label={t.soFilterClear}
                    title={t.soFilterClear}
                    className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-foreground/50 outline-none transition hover:bg-slate-100 hover:text-foreground focus-visible:ring-2 focus-visible:ring-app-accent dark:hover:bg-slate-700/40"
                  >
                    <X size={13} strokeWidth={2} aria-hidden />
                  </button>
                ) : null}
              </div>
              <datalist id="so-filter-options">
                {soOptions.map((so) => (
                  <option key={so} value={so} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {groups.length > 0 ? (
          <div
            className="mt-5 flex flex-wrap items-center gap-2"
            role="group"
            aria-label={t.viewLabel}
          >
            {(
              [
                { key: "all", label: t.viewAll, hint: undefined, count: viewCounts.all },
                { key: "active", label: t.viewActive, hint: t.viewActiveHint, count: viewCounts.active },
                { key: "attention", label: t.viewAttention, hint: t.viewAttentionHint, count: viewCounts.attention },
              ] as const
            ).map((v) => {
              const on = !soFilter && view === v.key;
              const hot = v.key === "attention" && v.count > 0;
              return (
                <button
                  key={v.key}
                  type="button"
                  aria-pressed={on}
                  title={v.hint}
                  onClick={() => setView(v.key)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition duration-150 ${
                    on
                      ? "border-app-accent/50 bg-app-accent-soft text-[#111827] shadow-sm"
                      : "border-app-border bg-white text-foreground/80 hover:border-app-accent/35 hover:bg-app-accent-soft/60 dark:bg-transparent"
                  }`}
                >
                  {v.label}
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
                      hot ? "bg-amber-500 text-slate-950" : "bg-slate-200 text-slate-700 dark:bg-slate-600/40 dark:text-slate-200"
                    }`}
                  >
                    {v.count}
                  </span>
                </button>
              );
            })}
            {soFilter ? <span className="text-xs text-app-muted">{t.soSearchAll}</span> : null}
          </div>
        ) : null}

        {groups.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-app-border bg-slate-50 px-4 py-6 text-sm text-foreground/60 dark:bg-transparent">
            {t.empty}
          </p>
        ) : (
          <div className="app-table-shell mt-6 max-h-[72vh] overflow-auto">
            <table className="w-full min-w-[2280px] border-collapse text-sm">
              <thead>
                <tr>
                  <th className={`${thCls} ${PIN_PO_W} ${PIN_PO_X} xl:z-20`}>{t.forecastPo}</th>
                  <th className={`${thCls} ${PIN_MONTH_W} ${PIN_MONTH_X} xl:z-20`}>{t.forecastMonth}</th>
                  <th className={`${thCls} ${PIN_SKU_W} ${PIN_SKU_X} xl:z-20`}>{t.sku}</th>
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
                      <td className={`${pinnedCellCls} ${PIN_PO_W} ${PIN_PO_X} whitespace-nowrap`}>
                        {row.isFirstOfGroup ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${poBadge}`}
                            >
                              {row.group.forecastPoNumber}
                            </span>
                            {region ? (
                              <span className="text-xs font-medium uppercase tracking-wide text-foreground/45">
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
                      <td
                        className={`${pinnedCellCls} ${PIN_MONTH_W} ${PIN_MONTH_X} whitespace-nowrap text-foreground/70`}
                      >
                        {formatForecastMonthLabel(row.group.forecastMonth, language)}
                      </td>
                      <td className={`${pinnedCellCls} ${PIN_SKU_W} ${PIN_SKU_X} whitespace-nowrap`}>
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-medium">{row.group.sku}</span>
                          {(() => {
                            const StatusIcon = STATUS_ICON[f.deliveryStatus];
                            return (
                              <span
                                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold ${
                                  STATUS_BADGE[f.deliveryStatus] ?? STATUS_BADGE_EMPTY
                                }`}
                              >
                                {StatusIcon ? <StatusIcon size={13} strokeWidth={2.5} aria-hidden /> : null}
                                {f.deliveryStatus || t.statusNotSet}
                              </span>
                            );
                          })()}
                          {row.shipment
                            ? (() => {
                                const issues = shipmentIssues(row.shipment, todayIso);
                                if (issues.length === 0) return null;
                                return (
                                  <div className="flex flex-col items-start gap-0.5" data-issues>
                                    {issues.map((i) => (
                                      <span
                                        key={i.code}
                                        className={`rounded px-1.5 py-0.5 text-xs font-semibold leading-tight ring-1 ring-inset ${
                                          i.code === "etaPassed"
                                            ? "bg-red-100 text-red-800 ring-red-300 dark:bg-red-500/15 dark:text-red-200 dark:ring-red-500/40"
                                            : "bg-amber-100 text-amber-900 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/40"
                                        }`}
                                      >
                                        {issueLabel(i)}
                                      </span>
                                    ))}
                                  </div>
                                );
                              })()
                            : null}
                        </div>
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
                        {row.isFirstOfGroup && isBufferPool(row.group)
                          ? (() => {
                              const { byRegion, left } = bufferUsage(row.group);
                              return (
                                <div className="mt-1 flex flex-col items-end gap-0.5 text-xs font-normal text-foreground/60">
                                  {[...SHIPMENT_REGIONS, ""].map((r) => {
                                    const qty = byRegion.get(r);
                                    return qty ? (
                                      <span key={r || "none"} className={r ? "" : "text-amber-700 dark:text-amber-300"}>
                                        {r || t.regionNone} {qty.toLocaleString()}
                                      </span>
                                    ) : null;
                                  })}
                                  <span className={left < 0 ? "font-semibold text-red-600" : ""}>
                                    {t.bufferLeft} {left.toLocaleString()}
                                  </span>
                                </div>
                              );
                            })()
                          : null}
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
                          <div className="flex items-center gap-1.5 text-xs">
                            <input
                              type="url"
                              value={f.soUrl}
                              onChange={(e) => setField(row, { soUrl: e.target.value })}
                              placeholder={t.soUrlPh}
                              aria-label={t.soUrlPh}
                              className={`${inputCls} min-w-0 flex-1 text-xs`}
                            />
                            {f.soUrl.trim().startsWith("http") ? (
                              <a
                                href={f.soUrl.trim()}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="shrink-0 text-app-accent underline-offset-2 hover:underline"
                              >
                                SO ↗
                              </a>
                            ) : null}
                            {row.shipment?.attachment ? null : (
                              <label
                                title={row.shipment ? t.uploadFile : t.saveFirst}
                                className={`relative inline-flex shrink-0 items-center justify-center rounded-lg border border-app-border p-1.5 ${
                                  row.shipment
                                    ? "cursor-pointer text-foreground/60 hover:bg-slate-100 hover:text-app-accent dark:hover:bg-slate-700/40"
                                    : "cursor-not-allowed text-foreground/35"
                                }`}
                              >
                                <Paperclip size={14} strokeWidth={1.75} aria-hidden />
                                <span className="sr-only">{t.uploadFile}</span>
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
                          {row.shipment?.attachment ? (
                            <div className="flex items-center gap-2 text-xs">
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
                            </div>
                          ) : null}
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
                        <div className="min-w-[9rem] space-y-1.5">
                          <input
                            type="text"
                            list="of-ship-to-options"
                            value={f.shipTo}
                            onChange={(e) => {
                              const shipTo = e.target.value;
                              // On a shared buffer row, pre-fill the region from the destination, but
                              // only while it is still empty or still the previous auto-suggestion —
                              // never overwrite a region the user picked on purpose.
                              const followSuggestion =
                                isBufferPool(row.group) &&
                                (f.region === "" || f.region === suggestRegionFromShipTo(f.shipTo));
                              setField(
                                row,
                                followSuggestion
                                  ? { shipTo, region: suggestRegionFromShipTo(shipTo) }
                                  : { shipTo },
                              );
                            }}
                            placeholder={t.shipTo}
                            aria-label={t.shipTo}
                            className={inputCls}
                          />
                          {isBufferPool(row.group) ? (
                            <select
                              value={f.region}
                              onChange={(e) => setField(row, { region: e.target.value })}
                              aria-label={t.region}
                              className={`${inputCls} text-xs ${
                                f.region
                                  ? ""
                                  : "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
                              }`}
                            >
                              <option value="">{t.regionSelect}</option>
                              {SHIPMENT_REGIONS.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                          ) : null}
                        </div>
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
                        <div className="flex min-w-[17rem] items-center gap-1.5">
                          <input
                            type="text"
                            value={f.trackingLink}
                            onChange={(e) => setField(row, { trackingLink: e.target.value })}
                            placeholder="https://…"
                            aria-label={t.trackingLink}
                            title={f.trackingLink || undefined}
                            className={`${inputCls} min-w-0 flex-1`}
                          />
                          {/^https?:\/\//i.test(f.trackingLink.trim()) ? (
                            <a
                              href={f.trackingLink.trim()}
                              target="_blank"
                              rel="noreferrer noopener"
                              title={t.openTracking}
                              aria-label={t.openTracking}
                              className="shrink-0 rounded-lg border border-app-border p-1.5 text-app-accent transition hover:bg-slate-100 dark:hover:bg-slate-700/40"
                            >
                              <ExternalLink size={14} strokeWidth={1.75} aria-hidden />
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <div className="min-w-[11.5rem]">
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
                          {row.shipment == null ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => fillFromContract(row)}
                              title={t.fillFromContractHint}
                              className="app-button-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs transition duration-150 ease-out hover:-translate-y-px active:translate-y-0 disabled:opacity-50"
                            >
                              <Wand2 size={14} strokeWidth={1.5} />
                              {t.fillFromContract}
                            </button>
                          ) : null}
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
            {rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-foreground/60">
                {soFilter ? t.soFilterNoMatch : view === "attention" ? t.attentionNone : t.viewEmpty}
              </p>
            ) : null}
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
