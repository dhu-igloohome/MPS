/**
 * Integration API scopes — client-safe constants (no server-only imports).
 * Keep this module free of `next/headers`/crypto so it can be used in client components.
 */
export const INTEGRATION_API_SCOPES = ["inventory:read", "fulfillment:read"] as const;

export type IntegrationApiScope = (typeof INTEGRATION_API_SCOPES)[number];

export function isIntegrationApiScope(value: string): value is IntegrationApiScope {
  return (INTEGRATION_API_SCOPES as readonly string[]).includes(value);
}
