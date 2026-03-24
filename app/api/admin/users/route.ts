import { NextResponse } from "next/server";

import { REGIONS } from "@/lib/accounts";
import {
  createAdminAuditLog,
  createUserAccount,
  listUsersWithRegions,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import { Region, UserRole } from "@/lib/types";

function isRegion(value: string): value is Region {
  return REGIONS.includes(value as Region);
}

function isRole(value: string): value is UserRole {
  return value === "super_admin" || value === "regional_admin";
}

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const users = await listUsersWithRegions();
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const username = String(body.username || "").trim();
  const displayName = String(body.displayName || "").trim();
  const password = String(body.password || "");
  const role = String(body.role || "");
  const regions = Array.isArray(body.regions)
    ? body.regions.map((item: unknown) => String(item)).filter(isRegion)
    : [];

  if (!username || !displayName || password.length < 6 || !isRole(role) || regions.length === 0) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  try {
    await createUserAccount({
      username,
      displayName,
      password,
      role,
      regions,
    });
    await createAdminAuditLog({
      actorUsername: session.username,
      action: "create_user",
      targetUsername: username,
      details: `role=${role}; regions=${regions.join(",")}`,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ message: "Create user failed" }, { status: 400 });
  }
}
