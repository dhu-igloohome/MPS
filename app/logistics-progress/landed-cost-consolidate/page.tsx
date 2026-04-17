import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LandedCostConsolidatePanel } from "@/components/logistics/landed-cost-consolidate-panel";
import { LogisticsSubnav } from "@/components/logistics/logistics-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { enrichForecastRecordsForCashFlow, getForecastsByRegions, listSuppliers } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LandedCostConsolidatePage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const [forecasts, suppliers] = await Promise.all([
    getForecastsByRegions(session.regions),
    listSuppliers(),
  ]);
  const cashFlowRows = await enrichForecastRecordsForCashFlow(forecasts);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Logistics Progress · Landed cost consolidate" : "物流进度 · 到岸成本汇总"}
      description={
        language === "en"
          ? "Forecast cash flow (for dashboard) — same table and PO date edits as Supply Chain → Cost control → Cash flow analysis."
          : "与「供应链 → 成本控制 → 现金流分析」中 Forecast 现金流（看板汇总）相同的表格与订单下达日期编辑。"
      }
    >
      <div className="space-y-4">
        <LogisticsSubnav language={language} />
        <LandedCostConsolidatePanel language={language} rows={cashFlowRows} fcSuppliers={suppliers} />
      </div>
    </AppShell>
  );
}
