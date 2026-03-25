import { NextResponse } from "next/server";

import { REGIONS } from "@/lib/accounts";
import { normalizeCsvHeader, parseCsvLine, splitCsvLines } from "@/lib/csv";
import {
  createAdminAuditLog,
  createUserAccount,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { Region, UserRole } from "@/lib/types";

const MAX_ROWS = 100;
const USERNAME_MAX = 80;
const DISPLAY_MAX = 120;

function isRegion(value: string): value is Region {
  return REGIONS.includes(value as Region);
}

function isRole(value: string): value is UserRole {
  return value === "super_admin" || value === "regional_admin";
}

type ColKey = "username" | "display_name" | "password" | "role" | "regions";

function resolveHeaderKey(normalized: string): ColKey | null {
  const map: Record<string, ColKey> = {
    username: "username",
    user: "username",
    user_name: "username",
    display_name: "display_name",
    displayname: "display_name",
    name: "display_name",
    password: "password",
    passwd: "password",
    initial_password: "password",
    role: "role",
    regions: "regions",
    region: "regions",
  };
  return map[normalized] ?? null;
}

function buildColumnIndex(headerCells: string[]): Map<ColKey, number> | { error: string } {
  const idx = new Map<ColKey, number>();
  for (let c = 0; c < headerCells.length; c++) {
    const key = resolveHeaderKey(normalizeCsvHeader(headerCells[c]));
    if (!key) continue;
    if (idx.has(key)) {
      return { error: `Duplicate column: ${key}` };
    }
    idx.set(key, c);
  }
  const required: ColKey[] = ["username", "display_name", "password", "role", "regions"];
  for (const k of required) {
    if (!idx.has(k)) {
      return { error: `Missing required column: ${k}` };
    }
  }
  return idx;
}

function cell(row: string[], col: Map<ColKey, number>, key: ColKey): string {
  const i = col.get(key);
  if (i === undefined) return "";
  return row[i] ?? "";
}

function parseRegionsCell(raw: string): Region[] | null {
  const parts = raw
    .split(/[|;,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: Region[] = [];
  for (const p of parts) {
    if (!isRegion(p)) return null;
    if (!out.includes(p)) out.push(p);
  }
  return out.length > 0 ? out : null;
}

function normalizeUsername(s: string): string {
  return s.trim().slice(0, USERNAME_MAX);
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: 'Missing file field "file"' }, { status: 400 });
  }

  const text = await file.text();
  const rawLines = splitCsvLines(text).filter((l) => !l.trim().startsWith("#"));
  if (rawLines.length < 2) {
    return NextResponse.json(
      { message: "CSV must include a header row and at least one data row" },
      { status: 400 },
    );
  }

  const headerParsed = parseCsvLine(rawLines[0]);
  const colResult = buildColumnIndex(headerParsed);
  if ("error" in colResult) {
    return NextResponse.json({ message: colResult.error }, { status: 400 });
  }
  const col = colResult;

  const dataLines = rawLines.slice(1);
  if (dataLines.length > MAX_ROWS) {
    return NextResponse.json({ message: `At most ${MAX_ROWS} data rows allowed` }, { status: 400 });
  }

  const errors: { row: number; message: string }[] = [];
  let created = 0;

  for (let r = 0; r < dataLines.length; r++) {
    const rowNum = r + 2;
    const row = parseCsvLine(dataLines[r]);
    if (row.every((x) => x.trim() === "")) continue;

    const username = normalizeUsername(cell(row, col, "username"));
    const displayName = cell(row, col, "display_name").trim().slice(0, DISPLAY_MAX);
    const password = cell(row, col, "password");
    const roleStr = cell(row, col, "role").trim();
    const regionsStr = cell(row, col, "regions").trim();

    if (!username) {
      errors.push({ row: rowNum, message: "Missing username" });
      continue;
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
      errors.push({ row: rowNum, message: "Invalid username (use letters, digits, . _ -)" });
      continue;
    }
    if (!displayName) {
      errors.push({ row: rowNum, message: "Missing display_name" });
      continue;
    }
    if (password.length < 6) {
      errors.push({ row: rowNum, message: "Password must be at least 6 characters" });
      continue;
    }
    if (!isRole(roleStr)) {
      errors.push({ row: rowNum, message: "Invalid role" });
      continue;
    }
    const regions = parseRegionsCell(regionsStr);
    if (!regions) {
      errors.push({ row: rowNum, message: "Invalid regions (use APAC, EU, USA separated by |)" });
      continue;
    }

    try {
      await createUserAccount({
        username,
        displayName,
        password,
        role: roleStr,
        regions,
      });
      await createAdminAuditLog({
        actorUsername: session.username,
        action: "create_user",
        targetUsername: username,
        details: `batch_csv; role=${roleStr}; regions=${regions.join(",")}`,
      });
      created += 1;
    } catch {
      errors.push({ row: rowNum, message: "Create failed (duplicate username or DB error)" });
    }
  }

  return NextResponse.json({
    ok: true,
    created,
    failed: errors.length,
    errors,
  });
}
