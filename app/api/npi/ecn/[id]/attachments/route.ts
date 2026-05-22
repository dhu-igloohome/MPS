import { NextResponse } from "next/server";

import {
  CONTRACT_FILE_MAX_BYTES,
  contractFileSizeError,
  contractFileTypeError,
  isAllowedContractFileName,
  resolveContractFileMimeType,
} from "@/lib/contract-file-upload-policy";
import { addEcnApprovalAttachment, getEcnApprovalById } from "@/lib/ecn-approval-repository";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const entry = await getEcnApprovalById(id);
  if (!entry) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (entry.status !== "draft") {
    return NextResponse.json({ message: "Attachments only on draft" }, { status: 400 });
  }
  if (entry.createdBy !== session.username && session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const language = request.headers.get("accept-language")?.includes("zh") ? "zh" : "en";
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ message: "Invalid form data" }, { status: 400 });
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
  try {
    const attachment = await addEcnApprovalAttachment({
      requestId: id,
      fileName: file.name,
      mimeType: resolveContractFileMimeType(file.name, file.type),
      fileData: buffer,
      uploadedBy: session.username,
    });
    return NextResponse.json({ ok: true, attachment });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
