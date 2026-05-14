import type { Language } from "@/lib/i18n";

/** Formats an ISO instant for dashboard “as of” copy (server or client). */
export function formatDataSnapshot(iso: string, language: Language): string {
  const en = language === "en";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(en ? "en-US" : "zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: en ? "UTC" : "Asia/Shanghai",
    hour12: en,
  }).format(d);
}

/** Date only (no time) for compact header chips; full instant still in tooltips. */
export function formatDataSnapshotDateOnly(iso: string, language: Language): string {
  const en = language === "en";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat(en ? "en-US" : "zh-CN", {
    dateStyle: "medium",
    timeZone: en ? "UTC" : "Asia/Shanghai",
  }).format(d);
}

/** Cross-reference copy under section headers: same instant as dashboard “as of”, client-side filters only. */
export function formatSamePageSnapshotCrossRef(iso: string, language: Language): string {
  const en = language === "en";
  const when = formatDataSnapshot(iso, language);
  return en
    ? `Same page snapshot as the header (${when}). Filters below only reshape this load — they do not fetch new data.`
    : `与页首快照一致（${when}）。以下筛选项仅在本页已加载数据上变换视图，不会重新请求。`;
}
