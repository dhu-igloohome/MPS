import type { ContractEntry, UserRole } from "@/lib/types";

/** Draft contracts only. regional_admin may delete own drafts; super_admin any draft. */
export function canDeleteDraftContract(
  role: UserRole,
  username: string,
  contract: Pick<ContractEntry, "status" | "createdBy">,
): boolean {
  if (contract.status !== "draft") return false;
  if (role === "super_admin") return true;
  return contract.createdBy.trim() === username.trim();
}
