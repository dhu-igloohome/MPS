import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { SessionPayload } from "@/lib/types";

export const SESSION_COOKIE_NAME = "mps_session";

const SESSION_SECRET =
  process.env.SESSION_SECRET || "mps-dev-secret-change-in-production";

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
    return payload;
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
