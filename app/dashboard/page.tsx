import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CockpitVisualizations } from "@/components/dashboard/cockpit-visualizations";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  getForecastsByRegions,
  listLogisticsShipmentsBySession,
  listOrderProgressBySessionRegions,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const entries = await getForecastsByRegions(session.regions);
  const orderProgressRows = await listOrderProgressBySessionRegions(session.regions);
  const logisticsRows = await listLogisticsShipmentsBySession(session);

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  const t = {
    title: language === "en" ? "Dashboard" : "仪表盘",
    description:
      language === "en"
        ? "Forecast overview charts at the top (all records in your scope), then order & logistics analytics."
        : "顶部为 Forecast 全景图表（权限内全部记录），下方为订单与物流分析。",
    exportCsv: language === "en" ? "Export forecast CSV" : "导出 Forecast CSV",
  };

  return (
    <AppShell session={session} title={t.title} description={t.description}>
      <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
        <a
          href="/api/dashboard/export-csv"
          className="inline-flex items-center rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-foreground/85 hover:border-app-accent/35 hover:bg-app-accent-soft hover:text-foreground"
        >
          {t.exportCsv}
        </a>
      </div>

      <CockpitVisualizations language={language} forecasts={entries} orderProgress={orderProgressRows} logistics={logisticsRows} />
    </AppShell>
  );
}
