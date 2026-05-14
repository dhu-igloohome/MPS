import { NextResponse } from "next/server";

import { deleteSupplierById, updateSupplier } from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

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

  const supplier = await updateSupplier({
    id,
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
  if (!supplier) return NextResponse.json({ message: "Supplier not found" }, { status: 404 });
  return NextResponse.json({ ok: true, supplier });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  await deleteSupplierById(id);
  return NextResponse.json({ ok: true });
}

