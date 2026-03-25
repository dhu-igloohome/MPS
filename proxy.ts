import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/potentials"];
const SESSION_COOKIE_NAME = "mps_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApiAuth = pathname.startsWith("/api/auth/");
  const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public");

  if (isApiAuth || isStaticAsset) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const sessionExists = Boolean(token);

  if (!sessionExists && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (sessionExists && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
