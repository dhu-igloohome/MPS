import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { REGIONS } from "@/lib/accounts";
import { SessionPayload } from "@/lib/types";

/**
 * regional_admin: full business data access (all regions). Region checkboxes in Admin
 * remain stored for reference; enforcement is lifted here. Admin Users/Products/templates,
 * buyer-entity edits, contract approval, and ECN rules stay super_admin-only elsewhere.
 */
function normalizeSessionPayload(payload: SessionPayload): SessionPayload {
  if (payload.role === "regional_admin") {
    return { ...payload, regions: [...REGIONS] };
  }
  return payload;
}

export const SESSION_COOKIE_NAME = "mps_session";

/** Shared with signed dashboard export tokens; keep in sync with any HMAC that gates session-bound APIs. */
export function getSessionSecret(): string {
  return process.env.SESSION_SECRET || "mps-dev-secret-change-in-production";
}

const SESSION_SECRET = getSessionSecret();

function sign(input: string) {
  return createHmac("sha256", SESSION_SECRET).update(input).digest("hex");
}

function toBase64(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function fromBase64(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

export function createSessionToken(payload: SessionPayload) {
  const encodedPayload = toBase64(JSON.stringify(payload));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = sign(encodedPayload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expectedSignature);

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64(encodedPayload)) as SessionPayload;
    return normalizeSessionPayload(payload);
  } catch {
    return null;
  }
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }
  return verifySessionToken(token);
}
