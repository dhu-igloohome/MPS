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
