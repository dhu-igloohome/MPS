import { NextResponse } from "next/server";

import { listBuyerEntities, upsertBuyerEntity } from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { BuyerEntityCode } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const buyerEntities = await listBuyerEntities();
  return NextResponse.json({ buyerEntities });
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (session.role !== "super_admin") return NextResponse.json({ message: "Forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const codeRaw = String(body.code ?? "").trim();
  const code = (codeRaw === "shenzhen" || codeRaw === "singapore" ? codeRaw : "") as BuyerEntityCode;
  if (!code) return NextResponse.json({ message: "Invalid code" }, { status: 400 });

  const legalName = String(body.legalName ?? "").trim();
  const address = String(body.address ?? "").trim();
  const contactName = String(body.contactName ?? "").trim();
  const contactPhone = String(body.contactPhone ?? "").trim();
  const email = String(body.email ?? "").trim();
  const companyRegNo = String(body.companyRegNo ?? "").trim();
  const gstRegNo = String(body.gstRegNo ?? "").trim();
  const isActive = body.isActive === undefined ? true : Boolean(body.isActive);

  if (!legalName) return NextResponse.json({ message: "Missing legalName" }, { status: 400 });
  if (!address) return NextResponse.json({ message: "Missing address" }, { status: 400 });

  try {
    const buyerEntity = await upsertBuyerEntity({
      code,
      legalName,
      address,
      contactName,
      contactPhone,
      email,
      companyRegNo,
      gstRegNo,
      isActive,
      updatedBy: session.username,
    });
    return NextResponse.json({ ok: true, buyerEntity });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update buyer entity failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

