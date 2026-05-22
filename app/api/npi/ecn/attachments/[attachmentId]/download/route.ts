import { NextResponse } from "next/server";

import { getEcnApprovalAttachmentDownload } from "@/lib/ecn-approval-repository";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ attachmentId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { attachmentId } = await context.params;
  const blob = await getEcnApprovalAttachmentDownload(attachmentId);
  if (!blob) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const safeName = blob.fileName.replace(/[^\w.\- ()[\]（）\u4e00-\u9fff]+/g, "_") || "ecn-file";

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
