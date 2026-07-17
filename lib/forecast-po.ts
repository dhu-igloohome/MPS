import type { ForecastRegion } from "@/lib/types";

/** PO 前缀：与 Forecast 填报 region 一致（USA → POU，OPS Department → POO）。 */
export function forecastPoPrefixForRegion(region: ForecastRegion): string {
  if (region === "APAC") return "POA";
  if (region === "EU") return "POE";
  if (region === "OPS Department") return "POO";
  return "POU";
}

/** YYYYMMDD，按 Asia/Singapore 当日历日（与业务语境一致）。 */
export function singaporeYmdCompact(): string {
  const head = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Singapore" }).slice(0, 10);
  return head.replace(/-/g, "");
}
