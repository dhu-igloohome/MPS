import {
  getEcnApproversForDepartment,
  type EcnApprovalDepartment,
  type EcnApprovalStatus,
  type EcnChangeTeam,
  type EcnFinishedGoodsDisposition,
  type EcnMaterialStockDisposition,
  type EcnProductionLineDisposition,
} from "@/lib/ecn-approval-config";
import { ensureDatabase, getSql } from "@/lib/db";
import type {
  EcnApprovalAttachmentEntry,
  EcnApprovalEntry,
  EcnApprovalSignoffEntry,
} from "@/lib/types";

function parseJiraLinks(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function serializeJiraLinks(links: string[]): string {
  return links.map((s) => s.trim()).filter(Boolean).join("\n");
}

type EcnRequestRow = {
  id: number;
  ecn_no: string;
  status: EcnApprovalStatus;
  sku: string;
  product_name: string;
  variant: string;
  change_team: EcnChangeTeam;
  change_reason: string;
  jira_links: string;
  import_batch: string;
  material_stock_disposition: EcnMaterialStockDisposition;
  production_line_disposition: EcnProductionLineDisposition;
  finished_goods_disposition: EcnFinishedGoodsDisposition;
  comments: string;
  production_files_url: string;
  approval_department: EcnApprovalDepartment;
  created_by: string;
  submitted_at: string | null;
  rejected_by: string | null;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
};

type AttachmentRow = {
  id: number;
  request_id: number;
  file_name: string;
  mime_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
};

type SignoffRow = {
  id: number;
  request_id: number;
  approver_username: string;
  decision: "pending" | "approved" | "rejected";
  comment: string;
  decided_at: string | null;
};

function mapAttachment(row: AttachmentRow): EcnApprovalAttachmentEntry {
  return {
    id: String(row.id),
    requestId: String(row.request_id),
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: Number(row.file_size),
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

function mapSignoff(row: SignoffRow): EcnApprovalSignoffEntry {
  return {
    id: String(row.id),
    approverUsername: row.approver_username,
    decision: row.decision,
    comment: row.comment || "",
    decidedAt: row.decided_at,
  };
}

function mapRequest(
  row: EcnRequestRow,
  attachments: EcnApprovalAttachmentEntry[],
  signoffs: EcnApprovalSignoffEntry[],
): EcnApprovalEntry {
  return {
    id: String(row.id),
    ecnNo: row.ecn_no,
    status: row.status,
    sku: row.sku,
    productName: row.product_name || "",
    variant: row.variant || "",
    changeTeam: row.change_team,
    changeReason: row.change_reason || "",
    jiraLinks: parseJiraLinks(row.jira_links),
    importBatch: row.import_batch || "",
    materialStockDisposition: row.material_stock_disposition,
    productionLineDisposition: row.production_line_disposition,
    finishedGoodsDisposition: row.finished_goods_disposition,
    comments: row.comments || "",
    productionFilesUrl: row.production_files_url || "",
    approvalDepartment: row.approval_department,
    createdBy: row.created_by,
    submittedAt: row.submitted_at,
    rejectedBy: row.rejected_by,
    rejectionReason: row.rejection_reason || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    attachments,
    signoffs,
  };
}

async function loadAttachmentsForRequests(
  requestIds: number[],
): Promise<Map<number, EcnApprovalAttachmentEntry[]>> {
  const map = new Map<number, EcnApprovalAttachmentEntry[]>();
  if (requestIds.length === 0) return map;
  const db = getSql();
  const rows = await db<AttachmentRow[]>`
    select id, request_id, file_name, mime_type, file_size, uploaded_by, created_at::text
    from ecn_approval_attachments
    where request_id = any(${requestIds}::bigint[])
    order by id asc;
  `;
  for (const row of rows) {
    const list = map.get(row.request_id) ?? [];
    list.push(mapAttachment(row));
    map.set(row.request_id, list);
  }
  return map;
}

async function loadSignoffsForRequests(requestIds: number[]): Promise<Map<number, EcnApprovalSignoffEntry[]>> {
  const map = new Map<number, EcnApprovalSignoffEntry[]>();
  if (requestIds.length === 0) return map;
  const db = getSql();
  const rows = await db<SignoffRow[]>`
    select id, request_id, approver_username, decision, comment, decided_at::text
    from ecn_approval_signoffs
    where request_id = any(${requestIds}::bigint[])
    order by id asc;
  `;
  for (const row of rows) {
    const list = map.get(row.request_id) ?? [];
    list.push(mapSignoff(row));
    map.set(row.request_id, list);
  }
  return map;
}

export async function allocateEcnApprovalNo(): Promise<string> {
  await ensureDatabase();
  const db = getSql();
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const prefix = `ECN-${y}${m}${d}-`;
  const rows = await db<{ ecn_no: string }[]>`
    select ecn_no from ecn_approval_requests
    where ecn_no like ${`${prefix}%`}
    order by ecn_no desc
    limit 1;
  `;
  let seq = 1;
  if (rows[0]?.ecn_no) {
    const tail = rows[0].ecn_no.slice(prefix.length);
    const n = Number.parseInt(tail, 10);
    if (Number.isFinite(n)) seq = n + 1;
  }
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export async function assertActiveProductSku(sku: string, variant?: string): Promise<{ productName: string }> {
  await ensureDatabase();
  const db = getSql();
  const skuTrim = sku.trim();
  if (!skuTrim) throw new Error("SKU is required");
  if (variant?.trim()) {
    const rows = await db<{ product_name: string }[]>`
      select product_name from products
      where sku = ${skuTrim} and variant = ${variant.trim()} and is_active = true
      limit 1;
    `;
    if (!rows[0]) throw new Error("SKU and variant not found in active Product Database");
    return { productName: rows[0].product_name };
  }
  const rows = await db<{ product_name: string }[]>`
    select product_name from products
    where sku = ${skuTrim} and is_active = true
    order by created_at desc
    limit 1;
  `;
  if (!rows[0]) throw new Error("SKU not found in active Product Database");
  return { productName: rows[0].product_name };
}

export async function listEcnApprovals(): Promise<EcnApprovalEntry[]> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<EcnRequestRow[]>`
    select
      id, ecn_no, status, sku, product_name, variant, change_team, change_reason, jira_links,
      import_batch, material_stock_disposition, production_line_disposition, finished_goods_disposition,
      comments, production_files_url, approval_department, created_by, submitted_at::text, rejected_by,
      rejection_reason, created_at::text, updated_at::text
    from ecn_approval_requests
    order by updated_at desc, id desc;
  `;
  const ids = rows.map((r) => r.id);
  const [attMap, signMap] = await Promise.all([
    loadAttachmentsForRequests(ids),
    loadSignoffsForRequests(ids),
  ]);
  return rows.map((row) =>
    mapRequest(row, attMap.get(row.id) ?? [], signMap.get(row.id) ?? []),
  );
}

export async function getEcnApprovalById(id: string): Promise<EcnApprovalEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const idNum = Number(id);
  if (!Number.isFinite(idNum) || idNum < 1) return null;
  const rows = await db<EcnRequestRow[]>`
    select
      id, ecn_no, status, sku, product_name, variant, change_team, change_reason, jira_links,
      import_batch, material_stock_disposition, production_line_disposition, finished_goods_disposition,
      comments, production_files_url, approval_department, created_by, submitted_at::text, rejected_by,
      rejection_reason, created_at::text, updated_at::text
    from ecn_approval_requests
    where id = ${idNum}
    limit 1;
  `;
  const row = rows[0];
  if (!row) return null;
  const [attMap, signMap] = await Promise.all([
    loadAttachmentsForRequests([row.id]),
    loadSignoffsForRequests([row.id]),
  ]);
  return mapRequest(row, attMap.get(row.id) ?? [], signMap.get(row.id) ?? []);
}

export type EcnApprovalDraftInput = {
  sku: string;
  variant?: string;
  changeTeam: EcnChangeTeam;
  changeReason: string;
  jiraLinks: string[];
  importBatch: string;
  materialStockDisposition: EcnMaterialStockDisposition;
  productionLineDisposition: EcnProductionLineDisposition;
  finishedGoodsDisposition: EcnFinishedGoodsDisposition;
  comments?: string;
  productionFilesUrl: string;
  approvalDepartment: EcnApprovalDepartment;
};

export async function createEcnApprovalDraft(
  input: EcnApprovalDraftInput,
  createdBy: string,
): Promise<EcnApprovalEntry> {
  await ensureDatabase();
  const db = getSql();
  const { productName } = await assertActiveProductSku(input.sku, input.variant);
  const ecnNo = await allocateEcnApprovalNo();
  const rows = await db<EcnRequestRow[]>`
    insert into ecn_approval_requests (
      ecn_no, status, sku, product_name, variant, change_team, change_reason, jira_links,
      import_batch, material_stock_disposition, production_line_disposition, finished_goods_disposition,
      comments, production_files_url, approval_department, created_by, updated_at
    ) values (
      ${ecnNo}, 'draft', ${input.sku.trim()}, ${productName},
      ${(input.variant ?? "").trim()}, ${input.changeTeam}, ${input.changeReason.trim()},
      ${serializeJiraLinks(input.jiraLinks)}, ${input.importBatch.trim()},
      ${input.materialStockDisposition}, ${input.productionLineDisposition},
      ${input.finishedGoodsDisposition}, ${(input.comments ?? "").trim()},
      ${input.productionFilesUrl.trim()}, ${input.approvalDepartment}, ${createdBy}, now()
    )
    returning
      id, ecn_no, status, sku, product_name, variant, change_team, change_reason, jira_links,
      import_batch, material_stock_disposition, production_line_disposition, finished_goods_disposition,
      comments, production_files_url, approval_department, created_by, submitted_at::text, rejected_by,
      rejection_reason, created_at::text, updated_at::text;
  `;
  return mapRequest(rows[0], [], []);
}

export async function updateEcnApprovalDraft(
  id: string,
  input: EcnApprovalDraftInput,
): Promise<EcnApprovalEntry | null> {
  await ensureDatabase();
  const db = getSql();
  const existing = await getEcnApprovalById(id);
  if (!existing || existing.status !== "draft") return null;
  const { productName } = await assertActiveProductSku(input.sku, input.variant);
  const idNum = Number(id);
  const rows = await db<EcnRequestRow[]>`
    update ecn_approval_requests
    set
      sku = ${input.sku.trim()},
      product_name = ${productName},
      variant = ${(input.variant ?? "").trim()},
      change_team = ${input.changeTeam},
      change_reason = ${input.changeReason.trim()},
      jira_links = ${serializeJiraLinks(input.jiraLinks)},
      import_batch = ${input.importBatch.trim()},
      material_stock_disposition = ${input.materialStockDisposition},
      production_line_disposition = ${input.productionLineDisposition},
      finished_goods_disposition = ${input.finishedGoodsDisposition},
      comments = ${(input.comments ?? "").trim()},
      production_files_url = ${input.productionFilesUrl.trim()},
      approval_department = ${input.approvalDepartment},
      updated_at = now()
    where id = ${idNum} and status = 'draft'
    returning
      id, ecn_no, status, sku, product_name, variant, change_team, change_reason, jira_links,
      import_batch, material_stock_disposition, production_line_disposition, finished_goods_disposition,
      comments, production_files_url, approval_department, created_by, submitted_at::text, rejected_by,
      rejection_reason, created_at::text, updated_at::text;
  `;
  if (!rows[0]) return null;
  const full = await getEcnApprovalById(id);
  return full;
}

export async function deleteEcnApprovalDraft(id: string): Promise<boolean> {
  await ensureDatabase();
  const db = getSql();
  const idNum = Number(id);
  const result = await db`
    delete from ecn_approval_requests where id = ${idNum} and status = 'draft';
  `;
  return result.count > 0;
}

export async function countEcnApprovalAttachments(requestId: string): Promise<number> {
  await ensureDatabase();
  const db = getSql();
  const rows = await db<{ count: string }[]>`
    select count(*)::text as count from ecn_approval_attachments where request_id = ${Number(requestId)};
  `;
  return Number(rows[0]?.count ?? 0);
}

export async function submitEcnApproval(id: string): Promise<EcnApprovalEntry> {
  const entry = await getEcnApprovalById(id);
  if (!entry) throw new Error("ECN not found");
  if (entry.status !== "draft") throw new Error("Only draft ECN can be submitted");
  if (!entry.sku.trim()) throw new Error("SKU is required");
  if (!entry.changeReason.trim()) throw new Error("Change reason is required");
  if (!entry.importBatch.trim()) throw new Error("Import batch is required");
  if (!entry.productionFilesUrl.trim()) throw new Error("Production files URL is required");
  if (entry.jiraLinks.length === 0) throw new Error("At least one JIRA link is required");
  const attCount = await countEcnApprovalAttachments(id);
  if (attCount < 1) throw new Error("At least one ECN attachment is required");

  await ensureDatabase();
  const db = getSql();
  const idNum = Number(id);
  const approvers = getEcnApproversForDepartment(entry.approvalDepartment);
  if (approvers.length === 0) throw new Error("No approvers configured for this department");

  await db`
    update ecn_approval_requests
    set status = 'under_review', submitted_at = now(), updated_at = now(),
        rejected_by = null, rejection_reason = ''
    where id = ${idNum} and status = 'draft';
  `;
  await db`delete from ecn_approval_signoffs where request_id = ${idNum};`;
  for (const username of approvers) {
    await db`
      insert into ecn_approval_signoffs (request_id, approver_username, decision)
      values (${idNum}, ${username}, 'pending');
    `;
  }

  const updated = await getEcnApprovalById(id);
  if (!updated) throw new Error("Submit failed");
  return updated;
}

export async function approveEcnApproval(
  id: string,
  approverUsername: string,
  options?: { superAdmin?: boolean },
): Promise<EcnApprovalEntry> {
  const entry = await getEcnApprovalById(id);
  if (!entry) throw new Error("ECN not found");
  if (entry.status !== "under_review") throw new Error("ECN is not under review");

  await ensureDatabase();
  const db = getSql();
  const idNum = Number(id);

  if (options?.superAdmin) {
    await db`
      update ecn_approval_signoffs
      set decision = 'approved', decided_at = now()
      where request_id = ${idNum} and decision = 'pending';
    `;
    await db`
      update ecn_approval_requests
      set status = 'approved', updated_at = now()
      where id = ${idNum};
    `;
    return (await getEcnApprovalById(id))!;
  }

  const pending = entry.signoffs.find(
    (s) => s.approverUsername === approverUsername && s.decision === "pending",
  );
  if (!pending) throw new Error("You are not a pending approver for this ECN");

  await db`
    update ecn_approval_signoffs
    set decision = 'approved', decided_at = now()
    where request_id = ${idNum} and approver_username = ${approverUsername} and decision = 'pending';
  `;

  const refreshed = await getEcnApprovalById(id);
  if (!refreshed) throw new Error("Approve failed");
  const allApproved = refreshed.signoffs.every((s) => s.decision === "approved");
  if (allApproved) {
    await db`
      update ecn_approval_requests
      set status = 'approved', updated_at = now()
      where id = ${idNum};
    `;
  }
  return (await getEcnApprovalById(id))!;
}

export async function rejectEcnApproval(
  id: string,
  approverUsername: string,
  rejectionReason: string,
): Promise<EcnApprovalEntry> {
  const entry = await getEcnApprovalById(id);
  if (!entry) throw new Error("ECN not found");
  if (entry.status !== "under_review") throw new Error("ECN is not under review");

  await ensureDatabase();
  const sql = getSql();
  const idNum = Number(id);
  const reasonText = rejectionReason.trim();
  await sql`
    update ecn_approval_requests
    set status = 'rejected', rejected_by = ${approverUsername},
        rejection_reason = ${reasonText}, updated_at = now()
    where id = ${idNum};
  `;
  await sql`
    update ecn_approval_signoffs
    set decision = 'rejected', decided_at = now()
    where request_id = ${idNum} and approver_username = ${approverUsername};
  `;
  return (await getEcnApprovalById(id))!;
}

export async function addEcnApprovalAttachment(input: {
  requestId: string;
  fileName: string;
  mimeType: string;
  fileData: Buffer;
  uploadedBy: string;
}): Promise<EcnApprovalAttachmentEntry> {
  await ensureDatabase();
  const db = getSql();
  const requestId = Number(input.requestId);
  const entry = await getEcnApprovalById(input.requestId);
  if (!entry || entry.status !== "draft") throw new Error("Attachments only allowed on draft ECN");

  const rows = await db<AttachmentRow[]>`
    insert into ecn_approval_attachments (
      request_id, file_name, mime_type, file_size, file_data, uploaded_by
    ) values (
      ${requestId}, ${input.fileName}, ${input.mimeType}, ${input.fileData.length},
      ${input.fileData}, ${input.uploadedBy}
    )
    returning id, request_id, file_name, mime_type, file_size, uploaded_by, created_at::text;
  `;
  return mapAttachment(rows[0]);
}

export async function getEcnApprovalAttachmentDownload(
  attachmentId: string,
): Promise<{ fileName: string; mimeType: string; fileData: Buffer } | null> {
  await ensureDatabase();
  const db = getSql();
  const idNum = Number(attachmentId);
  if (!Number.isFinite(idNum) || idNum < 1) return null;
  const rows = await db<{ file_name: string; mime_type: string; file_data: Uint8Array }[]>`
    select file_name, mime_type, file_data
    from ecn_approval_attachments where id = ${idNum} limit 1;
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileData: Buffer.from(row.file_data),
  };
}
