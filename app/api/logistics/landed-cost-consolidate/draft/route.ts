import { NextResponse } from "next/server";

import { createUserLccDraftForPo } from "@/lib/repositories";
import { getSession } from "@/lib/session";

/** Creates one LCC draft for the given PO (current user) if missing; no unit-cost quote sync. */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const poNumber = String(body.poNumber ?? "").trim();
  if (!poNumber) {
    return NextResponse.json({ message: "poNumber is required" }, { status: 400 });
  }

  try {
    const { created } = await createUserLccDraftForPo({
      sessionRegions: session.regions,
      username: session.username,
      poNumber,
    });
    return NextResponse.json({ created });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
