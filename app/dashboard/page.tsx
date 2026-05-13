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
        ? "Forecast overview, Forecast Cash flow analysis chart (Supply Chain cost control logic), then order & logistics analytics."
        : "顶部 Forecast 全景，其次为与成本控制一致的 Forecast 现金流（订金/尾款应付）图表，再为订单与物流分析。",
    exportCsv: language === "en" ? "Export forecast CSV" : "导出 Forecast CSV",
  };

  return (
    <AppShell session={session} title={t.title} description={t.description}>
      <CockpitVisualizations
        language={language}
        forecasts={entries}
        orderProgress={orderProgressRows}
        logistics={logisticsRows}
        forecastCashFlowRows={forecastCashFlowRows}
        fcSuppliers={suppliers}
        unitCostQuotes={unitCostQuotes}
        forecastExport={{ href: "/api/dashboard/export-csv", label: t.exportCsv }}
      />
    </AppShell>
  );
}
