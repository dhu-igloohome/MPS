import { NextResponse } from "next/server";

import { toCsvLine } from "@/lib/csv";
import { listOrderProgressBySessionRegions } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { OrderProgressDeliveryPlan, OrderProductionStep } from "@/lib/types";

function plansToCell(plans: OrderProgressDeliveryPlan[]): string {
  if (plans.length === 0) return "";
  const payload = plans.map((p) => ({
    expectedDeliveryDate: p.expectedDeliveryDate,
    quantity: p.quantity,
    progress: p.progress,
  }));
  return JSON.stringify(payload);
}

function productionStepsToCell(steps: OrderProductionStep[]): string {
  if (steps.length === 0) return "";
  return JSON.stringify(
    steps.map((s) => ({
      id: s.id,
      sortOrder: s.sortOrder,
      label: s.label,
      done: s.done,
      completedAt: s.completedAt,
      completedBy: s.completedBy,
    })),
  );
}

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const entries = await listOrderProgressBySessionRegions(session.regions);
  const header = [
    "id",
    "order_number",
    "product_name",
    "sku",
    "quantity",
    "order_date",
    "expected_delivery_date",
    "order_type",
    "progress",
    "factory_name",
    "region",
    "created_by",
    "created_at",
    "updated_at",
    "delivery_plans_json",
    "production_steps_json",
  ];

  const lines = [toCsvLine(header)];
  for (const e of entries) {
    lines.push(
      toCsvLine([
        e.id,
        e.orderNumber,
        e.productName,
        e.sku,
        e.quantity,
        e.orderDate,
        e.expectedDeliveryDate,
        e.orderType,
        e.progress,
        e.factoryName,
        e.region,
        e.createdBy,
        e.createdAt,
        e.updatedAt,
        plansToCell(e.deliveryPlans),
        productionStepsToCell(e.productionSteps),
      ]),
    );
  }

  const csv = lines.join("\n");
  const filename = `order-progress-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
