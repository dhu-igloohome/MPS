/** 审批路由：申请人选择所在部门，该部门配置的审批人须全部通过（会签）。 */
export type EcnApprovalDepartment = "ee_me" | "project" | "operations";

export type EcnChangeTeam = "me" | "ee" | "fw";

export type EcnApprovalStatus = "draft" | "under_review" | "approved" | "rejected";

export type EcnMaterialStockDisposition =
  | "keep_until_exhausted"
  | "rework"
  | "discard"
  | "per_comments";

export type EcnProductionLineDisposition = "keep_producing" | "change_material" | "per_comments";

export type EcnFinishedGoodsDisposition = "keep_using" | "rework" | "discard" | "per_comments";

export const ECN_APPROVAL_DEPARTMENTS: Record<
  EcnApprovalDepartment,
  { labelZh: string; labelEn: string; approvers: readonly string[] }
> = {
  ee_me: { labelZh: "EE / ME", labelEn: "EE / ME", approvers: ["jimmy"] },
  project: { labelZh: "Project", labelEn: "Project", approvers: ["even"] },
  operations: { labelZh: "运营部", labelEn: "Operations", approvers: ["david"] },
};

export const ECN_CHANGE_TEAMS: Record<EcnChangeTeam, { labelZh: string; labelEn: string }> = {
  me: { labelZh: "结构 (ME)", labelEn: "ME" },
  ee: { labelZh: "电子 (EE)", labelEn: "EE" },
  fw: { labelZh: "固件 (FW)", labelEn: "FW" },
};

export const ECN_MATERIAL_STOCK_OPTIONS: Record<
  EcnMaterialStockDisposition,
  { labelZh: string; labelEn: string }
> = {
  keep_until_exhausted: {
    labelZh: "继续使用，用完即止",
    labelEn: "Keep using until exhausted",
  },
  rework: { labelZh: "返工", labelEn: "Rework" },
  discard: { labelZh: "丢弃", labelEn: "Discard" },
  per_comments: { labelZh: "按备注", labelEn: "Per comments" },
};

export const ECN_PRODUCTION_LINE_OPTIONS: Record<
  EcnProductionLineDisposition,
  { labelZh: string; labelEn: string }
> = {
  keep_producing: { labelZh: "继续生产", labelEn: "Keep producing" },
  change_material: { labelZh: "更换物料", labelEn: "Change to new material" },
  per_comments: { labelZh: "按备注", labelEn: "Per comments" },
};

export const ECN_FINISHED_GOODS_OPTIONS: Record<
  EcnFinishedGoodsDisposition,
  { labelZh: string; labelEn: string }
> = {
  keep_using: { labelZh: "继续使用", labelEn: "Keep using" },
  rework: { labelZh: "返工", labelEn: "Rework" },
  discard: { labelZh: "丢弃", labelEn: "Discard" },
  per_comments: { labelZh: "按备注", labelEn: "Per comments" },
};

export function getEcnApproversForDepartment(dept: EcnApprovalDepartment): string[] {
  return [...ECN_APPROVAL_DEPARTMENTS[dept].approvers];
}

export function isEcnApprovalDepartment(value: string): value is EcnApprovalDepartment {
  return value === "ee_me" || value === "project" || value === "operations";
}

export function isEcnChangeTeam(value: string): value is EcnChangeTeam {
  return value === "me" || value === "ee" || value === "fw";
}

export function isEcnApprovalStatus(value: string): value is EcnApprovalStatus {
  return value === "draft" || value === "under_review" || value === "approved" || value === "rejected";
}

export function canUserActAsEcnApprover(
  username: string,
  department: EcnApprovalDepartment,
  role: string,
): boolean {
  if (role === "super_admin") return true;
  return getEcnApproversForDepartment(department).includes(username);
}
