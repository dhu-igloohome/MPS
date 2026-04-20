/**
 * Emergency reset for a user's password when nobody can log in to the admin UI.
 * Uses the same SHA256 hash as lib/security.ts.
 *
 * Usage (set POSTGRES_URL or DATABASE_URL in the environment):
 *   node scripts/reset-user-password.mjs david david123
 *
 * On Vercel: copy POSTGRES_URL from Project → Settings → Environment Variables,
 * then run locally or use the host's SQL editor with the printed UPDATE (see --sql-only).
 */
import postgres from "postgres";
import { createHash } from "node:crypto";

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

const args = process.argv.slice(2);
const sqlOnly = args.includes("--sql-only");
const filtered = args.filter((a) => a !== "--sql-only");
const [username, newPassword] = filtered;

if (!username || !newPassword) {
  console.error(
    "Usage: node scripts/reset-user-password.mjs <username> <new_password> [--sql-only]",
  );
  process.exit(1);
}

if (newPassword.length < 6) {
  console.error("Password must be at least 6 characters (same rule as admin API).");
  process.exit(1);
}

const hash = hashPassword(newPassword);

if (sqlOnly) {
  console.log("-- Run this in your Postgres SQL editor (Supabase / Vercel Postgres):\n");
  console.log(
    `UPDATE users SET password_hash = '${hash}' WHERE username = '${username.replace(/'/g, "''")}';`,
  );
  console.log("\n-- Verify row count = 1. Then log in with the new password.");
  process.exit(0);
}

const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing POSTGRES_URL or DATABASE_URL in the environment.");
  console.error("Or run with --sql-only to print SQL without a connection.");
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: "require", max: 1 });

try {
  const rows = await sql`
    update users
    set password_hash = ${hash}
    where username = ${username}
    returning username;
  `;
  if (rows.length === 0) {
    console.error(`No user found with username: ${username}`);
    process.exit(1);
  }
  console.log(`Password updated for: ${rows[0].username}`);
  console.log("You can log in with the new password now.");
} finally {
  await sql.end({ timeout: 5 });
}
