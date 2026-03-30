import { NextResponse } from "next/server";

import { validateCashFlowAgainstCostAnalysis } from "@/lib/cash-flow-cost-analysis-link";
import { computeCashFlowDerivedActuals, validateCashFlowRow } from "@/lib/cash-flow-validation";
import { deleteCashFlowEntryById, listCostAnalysisEntries, updateCashFlowEntryById } from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const sku = String(body.sku ?? "").trim();
  const orderDate = String(body.orderDate ?? "").trim();
  const orderNumber = String(body.orderNumber ?? "").trim();
  const quantity = Number(body.quantity);
  const unitPrice = Number(body.unitPrice);
  const totalAmount = Number(body.totalAmount);
  const advanceRatioPct = Number(body.advanceRatioPct);
  const paymentTermDays = Number(body.paymentTermDays);
  const finalRatioPct = Number(body.finalRatioPct);
  const remarks = String(body.remarks ?? "").trim();

  const actualAdvanceAmount =
    body.actualAdvanceAmount != null && body.actualAdvanceAmount !== ""
      ? Number(body.actualAdvanceAmount)
      : null;
  if (actualAdvanceAmount != null && Number.isNaN(actualAdvanceAmount)) {
    return NextResponse.json({ message: "Invalid actual advance amount" }, { status: 400 });
  }

  if (!sku || !orderDate || !orderNumber || Number.isNaN(quantity) || quantity < 0) {
    return NextResponse.json({ message: "Missing or invalid required fields" }, { status: 400 });
  }
  if (
    [unitPrice, totalAmount, advanceRatioPct, paymentTermDays, finalRatioPct].some(
      (n) => Number.isNaN(n) || !Number.isFinite(n),
    ) ||
    paymentTermDays < 0
  ) {
    return NextResponse.json({ message: "Invalid numeric fields" }, { status: 400 });
  }

  const { actualAdvanceDate, actualFinalDate, actualFinalAmount } = computeCashFlowDerivedActuals(
    orderDate,
    paymentTermDays,
    totalAmount,
    actualAdvanceAmount,
  );

  const v = validateCashFlowRow({
    quantity,
    unitPrice,
    totalAmount,
    advanceRatioPct,
    finalRatioPct,
    actualAdvanceAmount,
    actualFinalAmount,
  });
  if (!v.ok) {
    return NextResponse.json({ message: v.message }, { status: 400 });
  }

  const costRows = await listCostAnalysisEntries();
  const linkCheck = validateCashFlowAgainstCostAnalysis(orderNumber, sku, unitPrice, quantity, costRows);
  if (!linkCheck.ok) {
    return NextResponse.json({ message: linkCheck.message }, { status: 400 });
  }

  try {
    const entry = await updateCashFlowEntryById(id, {
      sku,
      orderDate,
      quantity,
      orderNumber,
      unitPrice,
      totalAmount,
      advanceRatioPct,
      paymentTermDays,
      finalRatioPct,
      actualAdvanceDate,
      actualAdvanceAmount,
      actualFinalDate,
      actualFinalAmount,
      remarks,
    });
    if (!entry) return NextResponse.json({ message: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const ok = await deleteCashFlowEntryById(id);
  if (!ok) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
