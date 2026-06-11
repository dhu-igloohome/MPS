"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { canDeleteDraftContract } from "@/lib/contract-draft-delete";
import type { Language } from "@/lib/i18n";
import type { ContractEntry, UserRole } from "@/lib/types";

type ContractDraftDeleteButtonProps = {
  contract: Pick<ContractEntry, "id" | "status" | "createdBy" | "poNumber">;
  role: UserRole;
  username: string;
  language: Language;
  /** After delete, navigate here (detail page). Omit to refresh in place (list). */
  redirectTo?: string;
  className?: string;
};

export function ContractDraftDeleteButton({
  contract,
  role,
  username,
  language,
  redirectTo,
  className = "",
}: ContractDraftDeleteButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const en = language === "en";

  if (!canDeleteDraftContract(role, username, contract)) return null;

  const label = en ? "Delete draft" : "删除草稿";
  const confirmMsg = en
    ? `Delete draft contract ${contract.poNumber}? This cannot be undone.`
    : `确定删除草稿合同 ${contract.poNumber}？此操作无法撤销。`;

  async function onDelete() {
    if (!window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/contracts/${encodeURIComponent(contract.id)}`, {
        method: "DELETE",
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) {
        toast.error(data.message || (en ? "Delete failed." : "删除失败。"));
        return;
      }
      toast.success(en ? "Draft deleted." : "草稿已删除。");
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void onDelete()}
      title={label}
      className={
        className ||
        "inline-flex items-center gap-1 rounded border border-red-200 px-2 py-1 text-xs text-red-600 transition duration-150 ease-out hover:bg-red-50 disabled:opacity-50"
      }
    >
      <Trash2 size={12} strokeWidth={1.5} />
      {label}
    </button>
  );
}
