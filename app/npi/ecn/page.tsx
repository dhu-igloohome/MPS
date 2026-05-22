import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { EcnApprovalFlow } from "@/components/npi/ecn-approval-flow";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listEcnApprovals } from "@/lib/ecn-approval-repository";
import { listProducts } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NpiEcnPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const [entries, products] = await Promise.all([listEcnApprovals(), listProducts()]);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "NPI Management · ECN Approval Flow" : "NPI 管理 · ECN 审批流"}
      description={
        language === "en"
          ? "Submit and approve engineering change notices in Foretracker."
          : "在 Foretracker 内提交与审批工程变更（ECN）。"
      }
    >
      <EcnApprovalFlow
        entries={entries}
        products={products}
        language={language}
        username={session.username}
        role={session.role}
      />
    </AppShell>
  );
}
