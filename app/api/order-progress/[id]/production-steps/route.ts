import { NextResponse } from "next/server";

import {
  getOrderProgressById,
  sessionCanAccessOrderProgressRegion,
  updateOrderProductionStepDone,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 });
  }

  const existing = await getOrderProgressById(id);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }

  if (!sessionCanAccessOrderProgressRegion(session.regions, existing.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const stepId = String(body.stepId ?? "").trim();
  const done = Boolean(body.done);
  if (!stepId) {
    return NextResponse.json({ message: "Missing stepId" }, { status: 400 });
  }

  const step = await updateOrderProductionStepDone({
    orderProgressId: id,
    stepId,
    done,
    username: session.username,
  });

  if (!step) {
    return NextResponse.json({ message: "Step not found or invalid" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, step });
}
