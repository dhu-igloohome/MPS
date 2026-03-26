import { NextResponse } from "next/server";

import {
  getContractById,
  getOrderProgressById,
  sessionCanAccessOrderProgressRegion,
  updateContractStatusById,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { ContractStatus } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

function isContractStatus(input: string): input is ContractStatus {
  return input === "draft" || input === "generated";
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const contract = await getContractById(id);
  if (!contract) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const order = await getOrderProgressById(contract.orderProgressId);
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (!sessionCanAccessOrderProgressRegion(session.regions, order.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "").trim();
  if (!isContractStatus(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }

  const updated = await updateContractStatusById(id, status);
  if (!updated) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, contract: updated });
}
