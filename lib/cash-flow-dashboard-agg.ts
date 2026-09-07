export function monthKeysBetween(from: string, to: string): string[] {
  const keys: string[] = [];
  const y = Number(from.slice(0, 4));
  const m = Number(from.slice(5, 7));
  const endY = Number(to.slice(0, 4));
  const endM = Number(to.slice(5, 7));
  let cy = y;
  let cm = m;
  while (cy < endY || (cy === endY && cm <= endM)) {
    keys.push(`${cy}-${String(cm).padStart(2, "0")}`);
    cm += 1;
    if (cm > 12) {
      cm = 1;
      cy += 1;
    }
  }
  return keys;
}

/** Inclusive month keys from `monthsBack` before the current calendar month through `monthsForward` after it (for payment-month charts). */
export function paymentMonthWindowAroundToday(monthsBack: number, monthsForward: number): string[] {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const idx = y * 12 + (m - 1);
  const startIdx = idx - monthsBack;
  const endIdx = idx + monthsForward;
  const sy = Math.floor(startIdx / 12);
  const sm = (startIdx % 12) + 1;
  const ey = Math.floor(endIdx / 12);
  const em = (endIdx % 12) + 1;
  const fromStr = `${sy}-${String(sm).padStart(2, "0")}-01`;
  const toStr = `${ey}-${String(em).padStart(2, "0")}-01`;
  return monthKeysBetween(fromStr, toStr);
}

/** Inclusive YYYY-MM-DD range covering the same months as `paymentMonthWindowAroundToday` (first day of first month → last day of last month). */
export function dateRangeForMonthWindowAroundToday(monthsBack: number, monthsForward: number): { from: string; to: string } {
  const months = paymentMonthWindowAroundToday(monthsBack, monthsForward);
  if (months.length === 0) return { from: "", to: "" };
  const first = months[0];
  const last = months[months.length - 1];
  const y = Number(last.slice(0, 4));
  const m = Number(last.slice(5, 7));
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${first}-01`, to: `${last}-${String(lastDay).padStart(2, "0")}` };
}

export type RangePreset = "12m" | "ytd" | "custom" | "pm3";

export function getDateRangePreset(preset: RangePreset, customFrom: string, customTo: string): { from: string; to: string } {
  const today = new Date();
  const toStr = today.toISOString().slice(0, 10);
  if (preset === "custom" && customFrom && customTo && customFrom <= customTo) {
    return { from: customFrom, to: customTo };
  }
  if (preset === "ytd") {
    const y = today.getFullYear();
    return { from: `${y}-01-01`, to: toStr };
  }
  if (preset === "pm3") {
    return dateRangeForMonthWindowAroundToday(3, 3);
  }
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCMonth(start.getUTCMonth() - 11);
  return { from: start.toISOString().slice(0, 10), to: toStr };
}
