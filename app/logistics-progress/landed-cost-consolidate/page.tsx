import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LandedCostConsolidatePanel } from "@/components/logistics/landed-cost-consolidate-panel";
import { LogisticsSubnav } from "@/components/logistics/logistics-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  enrichForecastRecordsForCashFlow,
  getForecastsByRegions,
  listLogisticsLandedCostConsolidateSnapshots,
  listUnitCostQuotes,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LandedCostConsolidatePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const [forecasts, unitCostQuotes, landedSnapshots] = await Promise.all([
    getForecastsByRegions(session.regions),
    listUnitCostQuotes(),
    listLogisticsLandedCostConsolidateSnapshots(120),
  ]);
  const cashFlowRows = await enrichForecastRecordsForCashFlow(forecasts);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Logistics Progress · Landed cost consolidate" : "物流进度 · 到岸成本汇总"}
      description={
        language === "en"
          ? "Pick a forecast PO to view consolidated landed cost (USD) from approved forecast lines in your regions."
          : "按 Forecast PO 查看您负责区域内已批准行的到岸成本（美元）汇总。"
      }
    >
      <div className="space-y-4">
        <LogisticsSubnav language={language} />
        <LandedCostConsolidatePanel
          language={language}
          rows={cashFlowRows}
          unitCostQuotes={unitCostQuotes}
          initialSnapshots={landedSnapshots}
          currentUsername={session.username}
        />
      </div>
    </AppShell>
  );
}
