import type { OrderProgressStatus } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isProgress(value: string): value is OrderProgressStatus {
  return value === "not_started" || value === "in_production" || value === "ready_to_ship";
}

export type ParsedOrderProgressDeliveryPlan = {
  expectedDeliveryDate: string;
  quantity: number;
  progress: OrderProgressStatus;
};

export function parseDeliveryPlansInput(
  raw: unknown,
): { ok: true; plans: ParsedOrderProgressDeliveryPlan[] } | { ok: false; message: string } {
  if (raw === undefined || raw === null) {
    return { ok: true, plans: [] };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, message: "deliveryPlans must be an array" };
  }
  const plans: ParsedOrderProgressDeliveryPlan[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      return { ok: false, message: "Invalid delivery plan row" };
    }
    const o = item as Record<string, unknown>;
    const date = String(o.expectedDeliveryDate ?? "");
    const qty = Number(o.quantity);
    const prog = String(o.progress ?? "");
    if (!DATE_RE.test(date)) {
      return { ok: false, message: "Invalid plan expected delivery date" };
    }
    if (!Number.isFinite(qty) || !Number.isInteger(qty) || qty < 0) {
      return { ok: false, message: "Invalid plan quantity" };
    }
    if (!isProgress(prog)) {
      return { ok: false, message: "Invalid plan progress" };
    }
    plans.push({ expectedDeliveryDate: date, quantity: qty, progress: prog });
  }
  return { ok: true, plans };
}
