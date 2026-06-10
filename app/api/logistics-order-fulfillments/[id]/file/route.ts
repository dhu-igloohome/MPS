import { NextResponse } from "next/server";

import {
  CONTRACT_FILE_MAX_BYTES,
  contractFileSizeError,
  contractFileTypeError,
  isAllowedContractFileName,
  resolveContractFileMimeType,
} from "@/lib/contract-file-upload-policy";
import {
  deleteFulfillmentShipmentFile,
  getFulfillmentShipmentFileDownload,
  setFulfillmentShipmentFile,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const blob = await getFulfillmentShipmentFileDownload(id);
  if (!blob) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const safeName = blob.fileName.replace(/[^\w.\- ()[\]（）\u4e00-\u9fff]+/g, "_") || "so-file";

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

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const language = request.headers.get("accept-language")?.includes("zh") ? "zh" : "en";

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { message: language === "en" ? "File is required." : "请选择文件。" },
      { status: 400 },
    );
  }
  if (file.size > CONTRACT_FILE_MAX_BYTES) {
    return NextResponse.json({ message: contractFileSizeError(language) }, { status: 400 });
  }
  if (!isAllowedContractFileName(file.name)) {
    return NextResponse.json({ message: contractFileTypeError(language) }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = resolveContractFileMimeType(file.name, file.type);

  const entry = await setFulfillmentShipmentFile({
    shipmentId: id,
    fileName: file.name,
    mimeType,
    fileData: buffer,
    uploadedBy: session.username,
  });
  if (!entry) return NextResponse.json({ message: "Shipment not found" }, { status: 404 });
  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const ok = await deleteFulfillmentShipmentFile(id);
  if (!ok) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
