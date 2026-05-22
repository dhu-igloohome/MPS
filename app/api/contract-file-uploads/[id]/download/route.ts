import { NextResponse } from "next/server";

import { getContractFileUploadDownload } from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const blob = await getContractFileUploadDownload(id);
  if (!blob) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const safeName = blob.fileName.replace(/[^\w.\- ()[\]（）\u4e00-\u9fff]+/g, "_") || "contract-file";

  return new NextResponse(new Uint8Array(blob.fileData), {
    status: 200,
    headers: {
      "Content-Type": blob.mimeType,
      "Content-Length": String(blob.fileData.length),
      "Content-Disposition": `attachment; filename="${encodeURIComponent(safeName)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
