import { NextResponse } from "next/server";

import { createSupplier, listSuppliers } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const suppliers = await listSuppliers();
  return NextResponse.json({ suppliers });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const name = String(body.name || "").trim();
  const address = String(body.address || "").trim();
  const contactName = String(body.contactName || "").trim();
  const contactPhone = String(body.contactPhone || "").trim();
  const email = String(body.email || "").trim();
  const paymentTerms = String(body.paymentTerms || "").trim();
  const leadTimeDays = Number(body.leadTimeDays ?? 0);
  const moq = Number(body.moq ?? 0);
  const incoterm = String(body.incoterm || "").trim();
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);
  const isDomesticContract = Boolean(body.isDomesticContract);
  if (!name) return NextResponse.json({ message: "Missing supplier name" }, { status: 400 });
  if (!Number.isFinite(leadTimeDays) || leadTimeDays < 0 || !Number.isFinite(moq) || moq < 0) {
    return NextResponse.json({ message: "Invalid numeric fields" }, { status: 400 });
  }

  try {
    const supplier = await createSupplier({
      name,
      address,
      contactName,
      contactPhone,
      email,
      paymentTerms,
      leadTimeDays,
      moq,
      incoterm,
      isDomesticContract,
      isActive,
    });
    return NextResponse.json({ ok: true, supplier });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create supplier failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

