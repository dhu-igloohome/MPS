import { NextResponse } from "next/server";

import {
  generateIntegrationApiKeyPlaintext,
  hashIntegrationApiKey,
  integrationApiKeyDisplayPrefix,
  isIntegrationApiScope,
} from "@/lib/integration-api-key";
import { createIntegrationApiKey, listIntegrationApiKeys } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const keys = await listIntegrationApiKeys();
  return NextResponse.json({ keys });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const label = String(body.label ?? "").trim();
  if (!label) {
    return NextResponse.json({ message: "Label is required (e.g. Berfin)" }, { status: 400 });
  }

  const rawScopes = Array.isArray(body.scopes) ? body.scopes : ["inventory:read"];
  const scopes = rawScopes.map((s) => String(s).trim()).filter(Boolean);
  if (scopes.length === 0 || scopes.some((s) => !isIntegrationApiScope(s))) {
    return NextResponse.json(
      { message: "Invalid scopes. Allowed: inventory:read" },
      { status: 400 },
    );
  }

  const plaintext = generateIntegrationApiKeyPlaintext();
  const entry = await createIntegrationApiKey({
    label,
    keyPrefix: integrationApiKeyDisplayPrefix(plaintext),
    keyHash: hashIntegrationApiKey(plaintext),
    scopes,
    createdBy: session.username,
  });

  return NextResponse.json({
    ok: true,
    /** Plaintext key — copy now; it cannot be retrieved again. */
    apiKey: plaintext,
    entry,
  });
}
