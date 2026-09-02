import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OrtReportManagement } from "@/components/quality-control/ort-report-management";
import { QualityControlSubnav } from "@/components/quality-control/quality-control-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listQcOrtReportEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QualityControlOrtReportsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const entries = await listQcOrtReportEntries();
  return (
    <AppShell
      session={session}
      title={language === "en" ? "Quality Control · ORT Reports" : "质量管理 · ORT 报告"}
      description={language === "en" ? "Manage ongoing reliability test (ORT) reports and corrective actions." : "管理产品可靠性 ORT 报告及纠正措施。"}
      moduleTabs={<QualityControlSubnav language={language} />}
    >
      <OrtReportManagement entries={entries} language={language} />
    </AppShell>
  );
}
