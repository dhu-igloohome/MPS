import { NextResponse } from "next/server";

import {
  CONTRACT_FILE_MAX_BYTES,
  contractFileSizeError,
  contractFileTypeError,
  isAllowedContractFileName,
  resolveContractFileMimeType,
} from "@/lib/contract-file-upload-policy";
import { createContractFileUpload, listContractFileUploads } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const uploads = await listContractFileUploads();
  return NextResponse.json({ uploads });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const language = request.headers.get("accept-language")?.includes("zh") ? "zh" : "en";

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
  }

  const poNumber = String(form.get("poNumber") ?? "").trim();
  if (!poNumber) {
    return NextResponse.json({ message: language === "en" ? "PO number is required." : "请填写 PO 号。" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ message: language === "en" ? "File is required." : "请选择文件。" }, { status: 400 });
  }

  if (file.size > CONTRACT_FILE_MAX_BYTES) {
    return NextResponse.json({ message: contractFileSizeError(language) }, { status: 400 });
  }

  if (!isAllowedContractFileName(file.name)) {
    return NextResponse.json({ message: contractFileTypeError(language) }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = resolveContractFileMimeType(file.name, file.type);
  const signedRaw = String(form.get("signedDate") ?? "").trim();

  try {
    const upload = await createContractFileUpload({
      poNumber,
      sku: String(form.get("sku") ?? ""),
      supplierName: String(form.get("supplierName") ?? ""),
      remark: String(form.get("remark") ?? ""),
      signedDate: signedRaw || null,
      fileName: file.name,
      mimeType,
      fileData: buffer,
      uploadedBy: session.username,
    });
    return NextResponse.json({ ok: true, upload });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
