import { NextResponse } from "next/server";

import { deleteForecastById, getForecastById } from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 });
  }
  const row = await getForecastById(id);
  if (!row) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (!session.regions.includes(row.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  await deleteForecastById(id);
  return NextResponse.json({ ok: true });
}
