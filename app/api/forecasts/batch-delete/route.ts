import { NextResponse } from "next/server";

import { deleteForecastsBatch } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const idsRaw = body.ids;
  const reason = String(body.reason ?? "").trim();

  if (!Array.isArray(idsRaw) || idsRaw.length === 0) {
    return NextResponse.json({ message: "ids must be a non-empty array" }, { status: 400 });
  }

  try {
    const result = await deleteForecastsBatch({
      ids: idsRaw.map((x) => String(x)),
      reason,
      deletedBy: session.username,
      sessionRegions: session.regions,
    });
    return NextResponse.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Batch delete failed";
    const lower = msg.toLowerCase();
    const status =
      lower.includes("not found") || lower.includes("invalid forecast")
        ? 404
        : lower.includes("no access") || lower.includes("forbidden")
          ? 403
          : lower.includes("at most") || lower.includes("no forecast ids") || lower.includes("reason")
            ? 400
            : 400;
    return NextResponse.json({ message: msg }, { status });
  }
}
