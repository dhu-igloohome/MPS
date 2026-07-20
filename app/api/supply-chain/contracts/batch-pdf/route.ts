import JSZip from "jszip";
import { NextResponse } from "next/server";

import { getContractById, sessionCanAccessContract } from "@/lib/repositories";
import {
  buildPrintablePODataForContract,
  printablePOFileName,
  resolvePrintablePONumber,
} from "@/lib/printable-po-data";
import { renderPrintablePOToPdfBuffer } from "@/lib/printable-po-pdf";
import { getSession } from "@/lib/session";

const MAX_BATCH = 200;

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const rawIds = Array.isArray(body.ids) ? body.ids : [];
  const ids: string[] = rawIds.map((id) => String(id)).filter(Boolean);
  const uniqueIds: string[] = [...new Set(ids)];
  if (uniqueIds.length === 0) {
    return NextResponse.json({ message: "No contract ids provided" }, { status: 400 });
  }
  if (uniqueIds.length > MAX_BATCH) {
    return NextResponse.json({ message: `At most ${MAX_BATCH} contracts per batch` }, { status: 400 });
  }

  const zip = new JSZip();
  const errors: { id: string; message: string }[] = [];
  const usedNames = new Set<string>();

  for (const id of uniqueIds) {
    const contract = await getContractById(id);
    if (!contract) {
      errors.push({ id, message: "Not found" });
      continue;
    }
    if (!(contract.status === "approved" || contract.status === "sent")) {
      errors.push({ id, message: "Not yet approved" });
      continue;
    }
    if (!(await sessionCanAccessContract(session.regions, contract))) {
      errors.push({ id, message: "Forbidden" });
      continue;
    }
    const displayPoNumber = await resolvePrintablePONumber(contract);
    const poData = await buildPrintablePODataForContract(contract, session.username, displayPoNumber);
    const pdfBuffer = await renderPrintablePOToPdfBuffer(poData);

    let fileName = printablePOFileName(contract, displayPoNumber);
    if (usedNames.has(fileName)) {
      fileName = fileName.replace(/\.pdf$/, `_${contract.id}.pdf`);
    }
    usedNames.add(fileName);
    zip.file(fileName, pdfBuffer);
  }

  if (usedNames.size === 0) {
    return NextResponse.json({ message: "No accessible/approved contracts to export", errors }, { status: 400 });
  }

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const today = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(zipBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="Contracts_${today}.zip"`,
      "Cache-Control": "no-store",
      "X-Skipped-Count": String(errors.length),
    },
  });
}
