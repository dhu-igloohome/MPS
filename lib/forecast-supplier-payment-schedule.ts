/**
 * Forecast cash-flow dashboard: derive deposit / balance due dates and amounts
 * from supplier Payment terms + Lead time (Supply Chain → Suppliers) and PO issue date.
 *
 * Model (calendar days):
 * - Deposit % (if any) is due on PO issue date.
 * - Balance % is due on PO issue date + lead_time_days + Net N days from terms.
 */

export type ParsedPaymentTerms = {
  depositPct: number;
  balancePct: number;
  netDays: number;
};

export type ForecastPaySchedule = {
  deposit: { dateYmd: string; amountUsd: number } | null;
  balance: { dateYmd: string; amountUsd: number } | null;
  /** True when supplier terms could not be parsed (show raw text in UI). */
  parseFailed: boolean;
};

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function addCalendarDays(ymd: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** English short date for schedule cells (avoids TZ issues). */
export function formatScheduleDateEnglish(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Best-effort parse of free-text payment terms.
 * Examples: "20% deposit, balance 80% Net 75 days", "Net 30", "100% TT"
 */
export function parsePaymentTerms(raw: string): ParsedPaymentTerms | null {
  const t = raw.replace(/\s+/g, " ").trim();
  if (!t || /^cash$/i.test(t)) return null;

  if (/\b100\s*%\s*(?:tt|in\s*advance|up\s*front|prepaid|advance)\b/i.test(t)) {
    return { depositPct: 100, balancePct: 0, netDays: 0 };
  }

  let depositPct: number | null = null;
  let balancePct: number | null = null;
  let netDays: number | null = null;

  const depM = t.match(/(\d+(?:\.\d+)?)\s*%\s*(?:deposit|advance|down\s*payment|prepayment)/i);
  if (depM) depositPct = Number(depM[1]);

  const balM = t.match(/\bbalance\s+(\d+(?:\.\d+)?)\s*%/i);
  if (balM) balancePct = Number(balM[1]);

  const netM =
    t.match(/\bNet\s+(\d+)\s*days?\b/i) ??
    t.match(/\b(\d+)\s*days?\s+net\b/i) ??
    t.match(/\bnet\s+(\d+)\b/i);
  if (netM) netDays = Number(netM[1]);

  if (depositPct == null && balancePct == null && netDays != null) {
    return { depositPct: 0, balancePct: 100, netDays };
  }

  if (depositPct == null && balancePct == null && netDays == null) return null;

  if (depositPct == null) depositPct = 0;
  if (balancePct == null) {
    balancePct = depositPct > 0 ? Math.max(0, 100 - depositPct) : 100;
  }
  if (netDays == null) netDays = 0;

  return { depositPct, balancePct, netDays };
}

export function computeForecastPaymentSchedule(input: {
  lineTotalUsd: number;
  poIssueDate: string;
  leadTimeDays: number;
  paymentTerms: string;
}): ForecastPaySchedule {
  const parsed = parsePaymentTerms(input.paymentTerms);
  if (!parsed) {
    return { deposit: null, balance: null, parseFailed: true };
  }

  const { depositPct, balancePct, netDays } = parsed;
  const lt = Math.max(0, Math.trunc(Number(input.leadTimeDays) || 0));
  const total = input.lineTotalUsd;

  const deposit =
    depositPct > 0
      ? {
          dateYmd: input.poIssueDate,
          amountUsd: roundMoney(total * (Math.min(100, depositPct) / 100)),
        }
      : null;

  const balanceOffsetDays = lt + Math.max(0, netDays);
  const balance =
    balancePct > 0
      ? {
          dateYmd: addCalendarDays(input.poIssueDate, balanceOffsetDays),
          amountUsd: roundMoney(total * (Math.min(100, balancePct) / 100)),
        }
      : null;

  return { deposit, balance, parseFailed: false };
}
