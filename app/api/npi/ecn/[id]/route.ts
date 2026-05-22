import { NextResponse } from "next/server";

import {
  deleteEcnApprovalDraft,
  getEcnApprovalById,
  updateEcnApprovalDraft,
  type EcnApprovalDraftInput,
} from "@/lib/ecn-approval-repository";
import {
  isEcnApprovalDepartment,
  isEcnChangeTeam,
} from "@/lib/ecn-approval-config";
import { getSession } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

function parseDraftBody(body: Record<string, unknown>): EcnApprovalDraftInput | { error: string } {
  const sku = String(body.sku ?? "").trim();
  const variant = String(body.variant ?? "").trim();
  const changeTeam = String(body.changeTeam ?? "").trim();
  const changeReason = String(body.changeReason ?? "").trim();
  const importBatch = String(body.importBatch ?? "").trim();
  const productionFilesUrl = String(body.productionFilesUrl ?? "").trim();
  const approvalDepartment = String(body.approvalDepartment ?? "").trim();
  const materialStockDisposition = String(body.materialStockDisposition ?? "").trim();
  const productionLineDisposition = String(body.productionLineDisposition ?? "").trim();
  const finishedGoodsDisposition = String(body.finishedGoodsDisposition ?? "").trim();
  const comments = String(body.comments ?? "").trim();
  const jiraRaw = body.jiraLinks;
  const jiraLinks = Array.isArray(jiraRaw)
    ? jiraRaw.map((v) => String(v).trim()).filter(Boolean)
    : String(jiraRaw ?? "")
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);

  if (!sku) return { error: "SKU is required" };
  if (!isEcnChangeTeam(changeTeam)) return { error: "Invalid change team" };
  if (!isEcnApprovalDepartment(approvalDepartment)) return { error: "Invalid approval department" };

  return {
    sku,
    variant: variant || undefined,
    changeTeam,
    changeReason,
    jiraLinks,
    importBatch,
    materialStockDisposition: materialStockDisposition as EcnApprovalDraftInput["materialStockDisposition"],
    productionLineDisposition: productionLineDisposition as EcnApprovalDraftInput["productionLineDisposition"],
    finishedGoodsDisposition: finishedGoodsDisposition as EcnApprovalDraftInput["finishedGoodsDisposition"],
    comments,
    productionFilesUrl,
    approvalDepartment,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const entry = await getEcnApprovalById(id);
  if (!entry) return NextResponse.json({ message: "Not found" }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const existing = await getEcnApprovalById(id);
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ message: "Only draft can be edited" }, { status: 400 });
  }
  if (existing.createdBy !== session.username && session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseDraftBody(body);
  if ("error" in parsed) return NextResponse.json({ message: parsed.error }, { status: 400 });

  try {
    const entry = await updateEcnApprovalDraft(id, parsed);
    if (!entry) return NextResponse.json({ message: "Update failed" }, { status: 400 });
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const existing = await getEcnApprovalById(id);
  if (!existing) return NextResponse.json({ message: "Not found" }, { status: 404 });
  if (existing.createdBy !== session.username && session.role !== "super_admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }
  const ok = await deleteEcnApprovalDraft(id);
  if (!ok) return NextResponse.json({ message: "Only draft can be deleted" }, { status: 400 });
  return NextResponse.json({ ok: true });
}
