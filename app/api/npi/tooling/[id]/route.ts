import { NextResponse } from "next/server";

import { deleteToolingEntryById, updateToolingEntry } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { ToolingStatus, ToolingType } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

function isToolingType(value: string): value is ToolingType {
  return value === "mold" || value === "fixture" || value === "gauge" || value === "tester";
}
function isToolingStatus(value: string): value is ToolingStatus {
  return value === "design" || value === "in_use" || value === "maintenance" || value === "scrapped";
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const toolingCode = String(body.toolingCode ?? "").trim();
  const toolingName = String(body.toolingName ?? "").trim();
  const toolingType = String(body.toolingType ?? "fixture").trim();
  const relatedSku = String(body.relatedSku ?? "").trim();
  const cmName = String(body.cmName ?? "").trim();
  const location = String(body.location ?? "").trim();
  const status = String(body.status ?? "design").trim();
  const owner = String(body.owner ?? "").trim();
  const manufacturer = String(body.manufacturer ?? "").trim();
  const startUseDateRaw = String(body.startUseDate ?? "").trim();
  const cycleCount = Number(body.cycleCount ?? 0);
  const cycleLimit = Number(body.cycleLimit ?? 0);
  const lastMaintenanceDateRaw = String(body.lastMaintenanceDate ?? "").trim();
  const nextMaintenanceDueRaw = String(body.nextMaintenanceDue ?? "").trim();
  const cost = Number(body.cost ?? 0);
  const currency = String(body.currency ?? "USD").trim();
  const remarks = String(body.remarks ?? "").trim();

  if (!toolingCode || !toolingName) {
    return NextResponse.json({ message: "Missing tooling code or tooling name" }, { status: 400 });
  }
  if (!isToolingType(toolingType) || !isToolingStatus(status)) {
    return NextResponse.json({ message: "Invalid status/type" }, { status: 400 });
  }
  if ([cycleCount, cycleLimit, cost].some((n) => Number.isNaN(n) || !Number.isFinite(n) || n < 0)) {
    return NextResponse.json({ message: "Invalid numeric fields" }, { status: 400 });
  }

  const entry = await updateToolingEntry({
    id,
    toolingCode,
    toolingName,
    toolingType,
    relatedSku,
    cmName,
    location,
    status,
    owner,
    manufacturer,
    startUseDate: startUseDateRaw ? startUseDateRaw.slice(0, 10) : null,
    cycleCount,
    cycleLimit,
    lastMaintenanceDate: lastMaintenanceDateRaw ? lastMaintenanceDateRaw.slice(0, 10) : null,
    nextMaintenanceDue: nextMaintenanceDueRaw ? nextMaintenanceDueRaw.slice(0, 10) : null,
    cost,
    currency,
    remarks,
  });
  if (!entry) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });
  await deleteToolingEntryById(id);
  return NextResponse.json({ ok: true });
}

