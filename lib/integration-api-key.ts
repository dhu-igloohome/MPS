import { createHash, randomBytes } from "node:crypto";

import { getSessionSecret } from "@/lib/session";

export const INTEGRATION_API_KEY_PREFIX = "mps_";

export const INTEGRATION_API_SCOPES = ["inventory:read", "fulfillment:read"] as const;

export type IntegrationApiScope = (typeof INTEGRATION_API_SCOPES)[number];

export function isIntegrationApiScope(value: string): value is IntegrationApiScope {
  return (INTEGRATION_API_SCOPES as readonly string[]).includes(value);
}

/** Generate a new plaintext API key (show once to the operator). */
export function generateIntegrationApiKeyPlaintext(): string {
  return `${INTEGRATION_API_KEY_PREFIX}${randomBytes(24).toString("base64url")}`;
}

export function integrationApiKeyDisplayPrefix(plaintext: string): string {
  const raw = plaintext.startsWith(INTEGRATION_API_KEY_PREFIX)
    ? plaintext.slice(INTEGRATION_API_KEY_PREFIX.length)
    : plaintext;
  return raw.slice(0, 8);
}

export function hashIntegrationApiKey(plaintext: string): string {
  return createHash("sha256")
    .update(`${getSessionSecret()}:integration-api-key:${plaintext}`)
    .digest("hex");
}

export function parseBearerIntegrationApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization")?.trim();
  if (!auth || !auth.toLowerCase().startsWith("bearer ")) return null;
  const raw = auth.slice(7).trim();
  if (!raw.startsWith(INTEGRATION_API_KEY_PREFIX) || raw.length < 20) return null;
  return raw;
}
