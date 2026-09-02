import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CertificationManagement } from "@/components/quality-control/certification-management";
import { QualityControlSubnav } from "@/components/quality-control/quality-control-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listQcCertificationEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function QualityControlCertificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const entries = await listQcCertificationEntries();
  return (
    <AppShell
      session={session}
      title={language === "en" ? "Quality Control · Certifications" : "质量管理 · 认证管理"}
      description={language === "en" ? "Track product certifications, standards and expiry status." : "跟踪产品认证、标准与到期状态。"}
      moduleTabs={<QualityControlSubnav language={language} />}
    >
      <CertificationManagement entries={entries} language={language} />
    </AppShell>
  );
}
