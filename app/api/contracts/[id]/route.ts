import { NextResponse } from "next/server";

import { canDeleteDraftContract } from "@/lib/contract-draft-delete";
import {
  deleteDraftContractById,
  getContractById,
  sessionCanAccessContract,
  updateContractStatusById,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { ContractStatus } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

function isContractStatus(input: string): input is ContractStatus {
  return input === "draft" || input === "approved" || input === "sent";
}

function canTransition(
  role: "super_admin" | "regional_admin",
  currentStatus: ContractStatus,
  nextStatus: ContractStatus,
) {
  if (currentStatus === nextStatus) return true;
  return role === "super_admin";
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const contract = await getContractById(id);
  if (!contract) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (!(await sessionCanAccessContract(session.regions, contract))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const status = String(body.status || "").trim();
  if (!isContractStatus(status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  }
  if (!canTransition(session.role, contract.status, status)) {
    return NextResponse.json({ message: "Transition not allowed for your role" }, { status: 403 });
  }

  const updated = await updateContractStatusById(id, status);
  if (!updated) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, contract: updated });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  const contract = await getContractById(id);
  if (!contract) return NextResponse.json({ message: "Not found" }, { status: 404 });

  if (!(await sessionCanAccessContract(session.regions, contract))) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  if (!canDeleteDraftContract(session.role, session.username, contract)) {
    const message =
      contract.status !== "draft"
        ? "Only draft contracts can be deleted."
        : session.role === "regional_admin"
          ? "Only draft contracts you created can be deleted."
          : "Delete not allowed.";
    return NextResponse.json({ message }, { status: 403 });
  }

  const ok = await deleteDraftContractById(id);
  if (!ok) {
    return NextResponse.json({ message: "Only draft contracts can be deleted." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
