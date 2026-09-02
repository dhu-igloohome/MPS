import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { EightDManagement } from "@/components/quality-control/eight-d-management";
import { QualityControlSubnav } from "@/components/quality-control/quality-control-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listQc8dReportEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QualityControlEightDPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const entries = await listQc8dReportEntries();
  return (
    <AppShell
      session={session}
      title={language === "en" ? "Quality Control · 8D Reports" : "质量管理 · 8D 报告"}
      description={language === "en" ? "Manage 8D problem solving for customer and field issues." : "管理客户与市场问题的 8D 问题解决流程。"}
      moduleTabs={<QualityControlSubnav language={language} />}
    >
      <EightDManagement entries={entries} language={language} />
    </AppShell>
  );
}
