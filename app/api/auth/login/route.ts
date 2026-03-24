import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authenticateUser } from "@/lib/repositories";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json();
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  const account = await authenticateUser(username, password);
  if (!account) {
    return NextResponse.json({ message: "Invalid credentials" }, { status: 401 });
  }

  const token = createSessionToken({
    username: account.username,
    displayName: account.displayName,
    role: account.role,
    regions: account.regions,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });

  return NextResponse.json({ ok: true });
}
