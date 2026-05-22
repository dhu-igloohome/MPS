import { NextResponse } from "next/server";

import {
  isEcnApprovalDepartment,
  isEcnChangeTeam,
} from "@/lib/ecn-approval-config";
import {
  createEcnApprovalDraft,
  listEcnApprovals,
  type EcnApprovalDraftInput,
} from "@/lib/ecn-approval-repository";
import { getSession } from "@/lib/session";

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
  if (!materialStockDisposition || !productionLineDisposition || !finishedGoodsDisposition) {
    return { error: "Inventory disposition fields are required" };
  }

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

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const entries = await listEcnApprovals();
  return NextResponse.json({ entries });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const parsed = parseDraftBody(body);
  if ("error" in parsed) return NextResponse.json({ message: parsed.error }, { status: 400 });

  try {
    const entry = await createEcnApprovalDraft(parsed, session.username);
    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Create failed";
    return NextResponse.json({ message: msg }, { status: 400 });
  }
}
