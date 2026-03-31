import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listBomEntries, listEcnEntries, listToolingEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NpiPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const [bomEntries, ecnEntries, toolingEntries] = await Promise.all([
    listBomEntries(),
    listEcnEntries(),
    listToolingEntries(),
  ]);
  const openEcnCount = ecnEntries.filter((e) => e.status !== "implemented" && e.status !== "rejected").length;
  const toolingDueCount = toolingEntries.filter(
    (e) => e.nextMaintenanceDue && new Date(e.nextMaintenanceDue).getTime() <= Date.now(),
  ).length;
  const criticalBomCount = bomEntries.filter((e) => e.isCritical).length;

  const cards = [
    {
      href: "/npi/bom",
      title: language === "en" ? "BOM Management" : "BOM 管理",
    },
    {
      href: "/npi/tooling",
      title: language === "en" ? "Tooling & Fixture" : "工装夹具管理",
    },
    {
      href: "/npi/ecn",
      title: language === "en" ? "ECN Management" : "ECN 管理",
    },
    {
      href: "/npi/sop",
      title: language === "en" ? "SOP Management" : "SOP 管理",
    },
    ...(session.role === "super_admin"
      ? [
          {
            href: "/admin/products",
            title: language === "en" ? "Product Database" : "产品数据库",
          },
        ]
      : []),
  ];

  return (
    <AppShell
      session={session}
      title={language === "en" ? "NPI Management" : "NPI 管理"}
      description={language === "en" ? "New Product Introduction management workbench." : "新产品导入管理工作台。"}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div className="app-card p-5">
          <p className="text-sm text-app-muted">{language === "en" ? "Open ECN" : "未关闭 ECN"}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#111827]">{openEcnCount}</p>
        </div>
        <div className="app-card p-5">
          <p className="text-sm text-app-muted">{language === "en" ? "Tooling Due Maintenance" : "到期保养工装"}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#111827]">{toolingDueCount}</p>
        </div>
        <div className="app-card p-5">
          <p className="text-sm text-app-muted">{language === "en" ? "Critical BOM Items" : "关键 BOM 项"}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-[#111827]">{criticalBomCount}</p>
        </div>
      </div>
      <div className="app-subnav mt-4 p-3">
        <div className="flex flex-wrap gap-2">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="app-subnav-link"
            >
              {card.title}
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

