import {
  hashIntegrationApiKey,
  parseBearerIntegrationApiKey,
  type IntegrationApiScope,
} from "@/lib/integration-api-key";
import {
  getIntegrationApiKeyByHash,
  touchIntegrationApiKeyLastUsed,
} from "@/lib/repositories";

export type IntegrationApiPrincipal = {
  keyId: string;
  label: string;
  scopes: string[];
};

export async function authenticateIntegrationRequest(
  request: Request,
  requiredScope: IntegrationApiScope,
): Promise<IntegrationApiPrincipal | null> {
  const plaintext = parseBearerIntegrationApiKey(request);
  if (!plaintext) return null;

  const entry = await getIntegrationApiKeyByHash(hashIntegrationApiKey(plaintext));
  if (!entry || !entry.isActive) return null;
  if (!entry.scopes.includes(requiredScope) && !entry.scopes.includes("*")) return null;

  await touchIntegrationApiKeyLastUsed(entry.id);
  return { keyId: entry.id, label: entry.label, scopes: entry.scopes };
}
