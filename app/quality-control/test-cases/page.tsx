import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { TestCaseManagement } from "@/components/quality-control/test-case-management";
import { QualityControlSubnav } from "@/components/quality-control/quality-control-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listQcTestCaseEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QualityControlTestCasesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const entries = await listQcTestCaseEntries();
  return (
    <AppShell
      session={session}
      title={language === "en" ? "Quality Control · Test Cases" : "质量管理 · 测试用例"}
      description={language === "en" ? "Maintain smart lock test cases and execution baselines." : "维护智能门锁测试用例及执行基线。"}
      moduleTabs={<QualityControlSubnav language={language} />}
    >
      <TestCaseManagement entries={entries} language={language} />
    </AppShell>
  );
}
