import { NextResponse } from "next/server";

import { getContractById, sessionCanAccessContract } from "@/lib/repositories";
import { buildPrintablePODataForContract, printablePOFileName } from "@/lib/printable-po-data";
import { renderPrintablePOToPdfBuffer } from "@/lib/printable-po-pdf";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const contract = await getContractById(id);
  if (!contract) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (!(contract.status === "approved" || contract.status === "sent")) {
    return NextResponse.json({ message: "Contract is not yet approved" }, { status: 403 });
  }
  if (!(await sessionCanAccessContract(session.regions, contract))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const poData = await buildPrintablePODataForContract(contract, session.username);
  const pdfBuffer = await renderPrintablePOToPdfBuffer(poData);
  const fileName = printablePOFileName(contract);

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
