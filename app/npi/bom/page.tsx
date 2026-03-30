import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { BomManagement } from "@/components/npi/bom-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listBomEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NpiBomPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const entries = await listBomEntries();

  return (
    <AppShell
      session={session}
      title={language === "en" ? "NPI · BOM Management" : "NPI · BOM 管理"}
      description={
        language === "en"
          ? "Maintain BOM lines with version, supplier, cost and lead-time fields."
          : "维护 BOM 明细、版本、供应商、成本与交期字段。"
      }
    >
      <BomManagement entries={entries} language={language} />
    </AppShell>
  );
}

