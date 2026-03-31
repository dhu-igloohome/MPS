import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SopManagement } from "@/components/npi/sop-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listSopEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NpiSopPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const entries = await listSopEntries();

  return (
    <AppShell
      session={session}
      title={language === "en" ? "NPI · SOP Management" : "NPI · SOP 管理"}
      description={
        language === "en"
          ? "Manage smart lock SOPs with process, control and release fields."
          : "管理智能门锁 SOP，覆盖工序、控制方法与发布信息。"
      }
    >
      <SopManagement entries={entries} language={language} />
    </AppShell>
  );
}
