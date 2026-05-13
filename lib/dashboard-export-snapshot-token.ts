import { createHmac, timingSafeEqual } from "node:crypto";

import { getSessionSecret } from "@/lib/session";
import type { Region } from "@/lib/types";

const DEFAULT_MAX_TOKEN_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * Max age of signed export `t` (ms). Override with env `DASHBOARD_EXPORT_SNAPSHOT_MAX_AGE_MS`
 * (integer, minimum 60000). Invalid or empty → 48h.
 */
function getMaxTokenAgeMs(): number {
  const raw = process.env.DASHBOARD_EXPORT_SNAPSHOT_MAX_AGE_MS;
  if (raw === undefined || raw === "") return DEFAULT_MAX_TOKEN_AGE_MS;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 60_000) return DEFAULT_MAX_TOKEN_AGE_MS;
  return n;
}

/** UTC fragment safe for filenames, e.g. `2026-05-13_103045Z`. */
export function dashboardExportFilenameUtcFragment(iso: string): string | null {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(iso);
  if (!m) return null;
  return `${m[1]}_${m[2]}${m[3]}${m[4]}Z`;
}

export type DashboardExportSnapshotPayload = {
  /** ISO instant shown as dashboard “as of”. */
  snapshotAt: string;
  username: string;
  regions: Region[];
};

function regionsKey(regions: Region[]) {
  return JSON.stringify([...new Set(regions)].sort());
}

/** Signed token for `GET /api/dashboard/export-csv?t=…` (binds user + regions + page snapshot time). */
export function signDashboardExportSnapshot(payload: DashboardExportSnapshotPayload): string {
  const rk = regionsKey(payload.regions);
  const body = `${payload.snapshotAt}|${payload.username}|${rk}`;
  const bodyB64 = Buffer.from(body, "utf8").toString("base64url");
  const sig = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  return `${bodyB64}.${sig}`;
}

export function verifyDashboardExportSnapshot(
  token: string | null,
  session: { username: string; regions: Region[] },
): { snapshotAt: string } | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0 || dot === token.length - 1) return null;
  const bodyB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  let body: string;
  try {
    body = Buffer.from(bodyB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const parts = body.split("|");
  if (parts.length !== 3) return null;
  const [snapshotAt, username, rk] = parts;
  if (!snapshotAt || !username) return null;
  if (username !== session.username) return null;
  if (rk !== regionsKey(session.regions)) return null;

  const expectedSig = createHmac("sha256", getSessionSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  const t = new Date(snapshotAt).getTime();
  if (Number.isNaN(t)) return null;
  if (Date.now() - t > getMaxTokenAgeMs()) return null;

  return { snapshotAt };
}
