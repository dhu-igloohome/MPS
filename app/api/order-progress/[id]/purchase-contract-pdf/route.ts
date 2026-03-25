import { NextResponse } from "next/server";

import { generatePurchaseContractPdf } from "@/lib/purchase-contract";
import { ensureDatabase, getSql } from "@/lib/db";
import {
  getActiveUnitCostByProductNameAndSku,
  getOrderProgressById,
  sessionCanAccessOrderProgressRegion,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

function addDays(dateOnly: string, days: number) {
  const [y, m, d] = dateOnly.split("-").map((x) => Number(x));
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function pad6(n: number) {
  return String(n).padStart(6, "0");
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Missing id" }, { status: 400 });
  }

  const existing = await getOrderProgressById(id);
  if (!existing) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (!sessionCanAccessOrderProgressRegion(session.regions, existing.region)) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const batch = String(body.batch ?? "").trim();
  const serialCode = String(body.serialCode ?? "").trim();
  const bluetoothId = String(body.bluetoothId ?? "").trim();
  if (!batch) {
    return NextResponse.json({ message: "Missing batch" }, { status: 400 });
  }

  const unitCost = await getActiveUnitCostByProductNameAndSku(existing.productName, existing.sku);
  if (unitCost === null) {
    return NextResponse.json({ message: "Cannot resolve unit cost" }, { status: 400 });
  }

  // Signed date = createdAt dateOnly; delivery date = createdAt + 8 weeks.
  const signedDate = existing.createdAt.slice(0, 10);
  const deliveryDate = addDays(signedDate, 56);
  const total = existing.quantity * unitCost;

  // Allocate PO number and persist fields. Keep idempotent: if already has poNumber, reuse.
  // We do this here (instead of on create) to avoid burning PO numbers when user clicks "No".
  await ensureDatabase();
  const db = getSql();
  let poNumber: string;
  try {
    const persisted = await db<{ po_number: string }[]>`
    with lock_row as (
      select po_number
      from order_progress
      where id = ${Number(id)}
      for update
    ),
    _ensure_seq as (
      insert into po_sequences (key, next_number)
      values ('IG-PO', 499)
      on conflict (key) do nothing
    ),
    seq as (
      update po_sequences
      set next_number = next_number + 1
      where key = 'IG-PO' and (select po_number from lock_row) is null
      returning next_number
    ),
    po as (
      select
        case
          when (select po_number from lock_row) is null
            then 'IG-PO-' || lpad((select next_number from seq)::text, 6, '0')
          else (select po_number from lock_row)
        end as po_number
    ),
    upd as (
      update order_progress
      set
        po_number = (select po_number from po),
        po_batch = ${batch},
        po_serial_code = ${serialCode},
        po_bluetooth_id = ${bluetoothId},
        unit_cost_snapshot = ${unitCost},
        po_delivery_date = ${deliveryDate}
      where id = ${Number(id)}
      returning po_number
    )
    select po_number from upd;
    `;

    poNumber = persisted[0]?.po_number || `IG-PO-${pad6(0)}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: `PO persist failed: ${msg}` }, { status: 500 });
  }

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await generatePurchaseContractPdf({
      poNumber,
      signedDate,
      sku: existing.sku,
      productName: existing.productName,
      batch,
      quantity: existing.quantity,
      unitCost,
      total,
      deliveryDate,
      serialCode,
      bluetoothId,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ message: `PDF generate failed: ${msg}` }, { status: 500 });
  }

  const filename = `${poNumber}-${existing.sku}.pdf`;
  const bodyBytes = Buffer.from(pdfBytes);
  return new Response(bodyBytes, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

