import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ToolingManagement } from "@/components/npi/tooling-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listToolingEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NpiToolingPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const entries = await listToolingEntries();

  return (
    <AppShell
      session={session}
      title={language === "en" ? "NPI · Tooling & Fixture" : "NPI · 工装夹具管理"}
      description={language === "en" ? "Track tooling lifecycle, cost and maintenance." : "管理工装夹具的生命周期、成本与保养。"}
    >
      <ToolingManagement entries={entries} language={language} />
    </AppShell>
  );
}

