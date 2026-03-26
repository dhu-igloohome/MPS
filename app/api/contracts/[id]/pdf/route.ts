import { NextResponse } from "next/server";

import { generatePurchaseContractPdf } from "@/lib/purchase-contract";
import {
  getContractById,
  getOrderProgressById,
  sessionCanAccessOrderProgressRegion,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const contract = await getContractById(id);
  if (!contract) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const order = await getOrderProgressById(contract.orderProgressId);
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (!sessionCanAccessOrderProgressRegion(session.regions, order.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const pdfBytes = await generatePurchaseContractPdf({
      poNumber: contract.poNumber,
      signedDate: contract.signedDate,
      sku: contract.sku,
      productName: contract.productName,
      batch: contract.batch,
      quantity: contract.quantity,
      unitCost: contract.unitCost,
      total: contract.totalAmount,
      deliveryDate: contract.deliveryDate,
      serialCode: contract.serialCode,
      bluetoothId: contract.bluetoothId,
    });

    const filename = `${contract.poNumber}-${contract.sku}.pdf`;
    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "PDF generation failed";
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}

