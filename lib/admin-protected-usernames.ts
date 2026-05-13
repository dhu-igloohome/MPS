/**
 * Admin accounts that cannot be deleted and cannot have role/regions weakened
 * (must stay super_admin with full control in UI).
 *
 * Override with env `ADMIN_PROTECTED_USERNAMES` — comma/semicolon/whitespace-separated
 * (case-insensitive). Default includes `david` for seed compatibility.
 */
const DEFAULT_PROTECTED = "david";

function parseProtectedSet(): Set<string> {
  const raw = process.env.ADMIN_PROTECTED_USERNAMES ?? DEFAULT_PROTECTED;
  return new Set(
    raw
      .split(/[,;|\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

const PROTECTED_USERNAMES = parseProtectedSet();

export function isAdminProtectedUsername(username: string): boolean {
  return PROTECTED_USERNAMES.has(username.trim().toLowerCase());
}
