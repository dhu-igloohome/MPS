import { NextResponse } from "next/server";

import { toCsvLine } from "@/lib/csv";
import { getSession } from "@/lib/session";

const HEADER = ["username", "display_name", "password", "role", "regions"];
const EXAMPLE = ["jdoe", "Jane Doe", "changeme12", "regional_admin", "APAC|USA"];

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const csv = [toCsvLine(HEADER), toCsvLine(EXAMPLE)].join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="users-import-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
