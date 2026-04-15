import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CashFlowDashboard } from "@/components/cost-control/cash-flow-dashboard";
import { CashFlowOverview } from "@/components/dashboard/cash-flow-overview";
import { CockpitVisualizations } from "@/components/dashboard/cockpit-visualizations";
import { AppShell } from "@/components/shared/app-shell";
import {
  aggregateByPeriod,
  buildSkuCashMetaFromOrderProgress,
  filterCashFlowForSession,
  scheduleCashFlowSlices,
  topSkuExposure,
} from "@/lib/cash-flow-overview";
import { normalizeLanguage } from "@/lib/i18n";
import {
  getForecastsByRegions,
  listCashFlowEntries,
  listCostAnalysisEntries,
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
  const cashFlowEntries = await listCashFlowEntries();
  const costAnalysisEntries = await listCostAnalysisEntries();
  const skuCashMeta = buildSkuCashMetaFromOrderProgress(orderProgressRows);
  const cashFlowForSession = filterCashFlowForSession(cashFlowEntries, skuCashMeta, session);
  const monthlySlices = scheduleCashFlowSlices(cashFlowForSession, skuCashMeta, "month");
  const quarterlySlices = scheduleCashFlowSlices(cashFlowForSession, skuCashMeta, "quarter");
  const cashFlowMonthly = {
    periods: aggregateByPeriod(monthlySlices),
    topSkus: topSkuExposure(monthlySlices, 12),
  };
  const cashFlowQuarterly = {
    periods: aggregateByPeriod(quarterlySlices),
    topSkus: topSkuExposure(quarterlySlices, 12),
  };

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  const t = {
    title: language === "en" ? "Dashboard" : "仪表盘",
    description:
      language === "en"
        ? "Forecast, order & logistics analytics — same interactive style as Cost control. Cash flow analysis above, cash flow overview below."
        : "Forecast、订单与物流分析 — 与成本控制模块相同的交互式看板；上方为现金流分析，下方为现金流概览。",
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

      <CashFlowDashboard
        language={language}
        entries={cashFlowEntries}
        costAnalysisEntries={costAnalysisEntries}
      />

      <CashFlowOverview language={language} monthly={cashFlowMonthly} quarterly={cashFlowQuarterly} />
    </AppShell>
  );
}
