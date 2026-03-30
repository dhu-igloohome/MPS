import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NpiPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  const cards = [
    {
      href: "/npi/bom",
      title: language === "en" ? "BOM Management" : "BOM 管理",
      desc: language === "en" ? "Manage BOM versions and component lines." : "管理 BOM 版本与元件明细。",
    },
    {
      href: "/npi/tooling",
      title: language === "en" ? "Tooling & Fixture" : "工装夹具管理",
      desc: language === "en" ? "Track tooling usage and maintenance." : "跟踪工装寿命与保养状态。",
    },
    {
      href: "/npi/ecn",
      title: language === "en" ? "ECN Management" : "ECN 管理",
      desc: language === "en" ? "Manage engineering change requests and approvals." : "管理工程变更流程与影响。",
    },
  ];

  return (
    <AppShell
      session={session}
      title={language === "en" ? "NPI Module" : "NPI 模块"}
      description={language === "en" ? "New Product Introduction workbench." : "新产品导入工作台。"}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm transition hover:border-app-accent/35 hover:bg-app-accent-soft">
            <h3 className="text-base font-semibold text-foreground">{card.title}</h3>
            <p className="mt-1 text-sm text-app-muted">{card.desc}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

