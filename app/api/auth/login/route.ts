import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { authenticateUser } from "@/lib/repositories";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/session";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const username = String(raw.username ?? "").trim();
  const password = String(raw.password ?? "").trim();

  try {
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
  } catch (error) {
    console.error("[api/auth/login]", error);
    return NextResponse.json(
      { message: "Service temporarily unavailable", code: "SERVICE_ERROR" },
      { status: 503 },
    );
  }
}
