import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CockpitVisualizations } from "@/components/dashboard/cockpit-visualizations";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  enrichForecastRecordsForCashFlow,
  getForecastsByRegions,
  listLogisticsShipmentsBySession,
  listOrderProgressBySessionRegions,
  listSuppliers,
  listUnitCostQuotes,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [entries, orderProgressRows, logisticsRows, suppliers, unitCostQuotes] = await Promise.all([
    getForecastsByRegions(session.regions),
    listOrderProgressBySessionRegions(session.regions),
    listLogisticsShipmentsBySession(session),
    listSuppliers(),
    listUnitCostQuotes(),
  ]);
  const forecastCashFlowRows = await enrichForecastRecordsForCashFlow(entries);

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  const t = {
    title: language === "en" ? "Dashboard" : "仪表盘",
    description:
      language === "en"
        ? "Forecast overview, cash flow analysis charts (same as Supply Chain cost control), then order & logistics analytics."
        : "顶部 Forecast 全景，其次为与供应链成本控制一致的现金流分析图表，再为订单与物流分析。",
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

      <CockpitVisualizations
        language={language}
        forecasts={entries}
        orderProgress={orderProgressRows}
        logistics={logisticsRows}
        forecastCashFlowRows={forecastCashFlowRows}
        fcSuppliers={suppliers}
        unitCostQuotes={unitCostQuotes}
      />
    </AppShell>
  );
}
