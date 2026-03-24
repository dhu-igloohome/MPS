import { NextResponse } from "next/server";

import { REGIONS } from "@/lib/accounts";
import {
  deleteUserAccount,
  resetUserPassword,
  updateUserRegionsAndRole,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import { Region, UserRole } from "@/lib/types";

function isRegion(value: string): value is Region {
  return REGIONS.includes(value as Region);
}

function isRole(value: string): value is UserRole {
  return value === "super_admin" || value === "regional_admin";
}

function isProtectedUser(username: string) {
  return username === "david";
}

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { username } = await context.params;
  if (!username) {
    return NextResponse.json({ message: "Invalid username" }, { status: 400 });
  }

  const body = await request.json();
  const role = String(body.role || "");
  const regions = Array.isArray(body.regions)
    ? body.regions.map((item: unknown) => String(item)).filter(isRegion)
    : [];
  const password = body.password ? String(body.password) : "";

  if (isProtectedUser(username) && role !== "super_admin") {
    return NextResponse.json({ message: "Cannot downgrade david" }, { status: 400 });
  }

  if (regions.length > 0) {
    if (!isRole(role)) {
      return NextResponse.json({ message: "Invalid role" }, { status: 400 });
    }
    await updateUserRegionsAndRole({ username, role, regions });
  }

  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ message: "Password too short" }, { status: 400 });
    }
    await resetUserPassword(username, password);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const { username } = await context.params;
  if (!username || isProtectedUser(username)) {
    return NextResponse.json({ message: "Cannot delete this user" }, { status: 400 });
  }

  await deleteUserAccount(username);
  return NextResponse.json({ ok: true });
}
