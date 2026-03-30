import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NpiEcnPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "NPI · ECN Management" : "NPI · ECN 管理"}
      description={language === "en" ? "Planned next: ECN workflow and impact tracking." : "下一步将实现 ECN 流程与影响追踪。"}
    >
      <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm text-sm text-app-muted">
        {language === "en" ? "This page is prepared. Next step is full CRUD + approval flow." : "页面入口已创建，下一步实现完整 CRUD 与审批流。"}
        <div className="mt-3">
          <Link href="/npi" className="text-app-accent hover:underline">{language === "en" ? "Back to NPI index" : "返回 NPI 首页"}</Link>
        </div>
      </section>
    </AppShell>
  );
}

