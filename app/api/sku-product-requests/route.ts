import { NextResponse } from "next/server";

import {
  createSkuProductRequest,
  listSkuProductRequests,
  listPendingSkuProductRequests,
} from "@/lib/sku-product-request-repository";
import { getSession } from "@/lib/session";
import type { SkuProductRequestStatus } from "@/lib/types";

function isStatus(v: string): v is SkuProductRequestStatus {
  return v === "pending" || v === "approved" || v === "rejected";
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const statusParam = url.searchParams.get("status")?.trim() ?? "";
  const pendingOnly = url.searchParams.get("pending") === "1";

  if (session.role !== "super_admin") {
    if (pendingOnly || statusParam === "pending") {
      const entries = await listPendingSkuProductRequests();
      return NextResponse.json({ entries });
    }
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (pendingOnly) {
    const entries = await listPendingSkuProductRequests();
    return NextResponse.json({ entries });
  }
  const status = statusParam && isStatus(statusParam) ? statusParam : undefined;
  const entries = await listSkuProductRequests(status ? { status } : undefined);
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const productName = String(body.productName ?? "");
  const sku = String(body.sku ?? "");
  const variant = String(body.variant ?? "1");
  const articleNumber = String(body.articleNumber ?? "");
  const requestNote = String(body.requestNote ?? "");
  const unitCostRaw = Number(body.unitCost);
  const unitCost = Number.isFinite(unitCostRaw) && unitCostRaw >= 0 ? unitCostRaw : 0;

  try {
    const entry = await createSkuProductRequest({
      productName,
      sku,
      variant,
      articleNumber,
      unitCost,
      requestNote,
      requestedBy: session.username,
    });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create request failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
