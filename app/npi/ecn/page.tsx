import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { EcnManagement } from "@/components/npi/ecn-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listEcnEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NpiEcnPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const entries = await listEcnEntries();

  return (
    <AppShell
      session={session}
      title={language === "en" ? "NPI Management · ECN Management" : "NPI 管理 · ECN 管理"}
      description={language === "en" ? "Manage engineering changes, status and impact." : "管理工程变更流程、状态与影响。"}
    >
      <EcnManagement entries={entries} language={language} />
    </AppShell>
  );
}

