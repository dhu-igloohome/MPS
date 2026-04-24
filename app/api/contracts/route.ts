import { NextResponse } from "next/server";

import { createContractFromOrder, listContractsBySessionRegions } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const contracts = await listContractsBySessionRegions(session.regions);
  return NextResponse.json({ contracts });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const orderProgressId = String(body.orderProgressId || "").trim();
  const supplierId = String(body.supplierId || "").trim();
  const batch = String(body.batch || "").trim();
  const currency = String(body.currency || "USD").trim();
  const paymentTerms = String(body.paymentTerms || "Cash").trim();
  const remark = String(body.remark ?? body.qualityRemarks ?? "").trim();
  const deliveryAddress = String(body.deliveryAddress || "").trim();
  const serialCode = String(body.serialCode || "").trim();
  const bluetoothId = String(body.bluetoothId || "").trim();

  if (!orderProgressId || !supplierId || !batch || !currency || !paymentTerms || !deliveryAddress) {
    return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
  }

  try {
    const contract = await createContractFromOrder({
      orderProgressId,
      supplierId,
      batch,
      currency,
      paymentTerms,
      remark,
      deliveryAddress,
      serialCode,
      bluetoothId,
      createdBy: session.username,
    });
    return NextResponse.json({ ok: true, contract });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create contract failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

