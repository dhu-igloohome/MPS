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
    {
      href: "/npi/sop",
      title: language === "en" ? "SOP Management" : "SOP 管理",
      desc: language === "en" ? "Manage SOP release, training and process controls." : "管理 SOP 发布、培训与过程控制。",
    },
    ...(session.role === "super_admin"
      ? [
          {
            href: "/admin/products",
            title: language === "en" ? "Product Database" : "产品数据库",
            desc:
              language === "en"
                ? "Manage product name, SKU, variant, unit cost, and article number."
                : "管理产品名称、SKU、型号、单价和 Article Number。",
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
        <div className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
          <p className="text-sm text-app-muted">{language === "en" ? "Open ECN" : "未关闭 ECN"}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{openEcnCount}</p>
        </div>
        <div className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
          <p className="text-sm text-app-muted">{language === "en" ? "Tooling Due Maintenance" : "到期保养工装"}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{toolingDueCount}</p>
        </div>
        <div className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
          <p className="text-sm text-app-muted">{language === "en" ? "Critical BOM Items" : "关键 BOM 项"}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{criticalBomCount}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-4">
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

