import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CostControlPanel } from "@/components/cost-control/cost-control-panel";
import { SupplyChainSubnav } from "@/components/supply-chain/supply-chain-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { getForecastsByRegions, listCashFlowEntries, listCostAnalysisEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SupplyChainCostControlPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const [cashFlowEntries, costAnalysisEntries, forecastRecords] = await Promise.all([
    listCashFlowEntries(),
    listCostAnalysisEntries(),
    getForecastsByRegions(session.regions),
  ]);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Supply Chain Management" : "供应链管理"}
      description={language === "en" ? "Suppliers, contracts and cost control in one module." : "将供应商、合同、成本控制整合到同一模块。"}
    >
      <SupplyChainSubnav language={language} />
      <Suspense
        fallback={
          <div className="mt-4 h-40 animate-pulse rounded-2xl border border-app-border/80 bg-app-surface/80" />
        }
      >
        <CostControlPanel
          language={language}
          cashFlowEntries={cashFlowEntries}
          costAnalysisEntries={costAnalysisEntries}
          forecastRecords={forecastRecords}
        />
      </Suspense>
    </AppShell>
  );
}

