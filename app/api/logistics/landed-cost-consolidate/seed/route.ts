import { NextResponse } from "next/server";

import { seedUserLccDraftsFromForecasts } from "@/lib/repositories";
import { getSession } from "@/lib/session";

/** Creates missing per-PO LCC draft rows for the current user (no unit-cost quote sync). */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try {
    const { created, skipped } = await seedUserLccDraftsFromForecasts({
      sessionRegions: session.regions,
      username: session.username,
    });
    return NextResponse.json({ created, skipped });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Seed failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
