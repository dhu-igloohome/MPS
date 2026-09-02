import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CostControlPanel } from "@/components/supply-chain/cost-control/cost-control-panel";
import { SupplyChainSubnav } from "@/components/supply-chain/supply-chain-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { computeForecastContractCoverage } from "@/lib/contract-forecast-coverage";
import {
  enrichForecastRecordsForCashFlow,
  getForecastsByRegions,
  listCashFlowEntries,
  listContractsBySessionRegions,
  listCostAnalysisEntries,
  listSuppliers,
  listUnitCostQuotes,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SupplyChainCostControlPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  // Kick off forecasts first so the dependent enrich step can overlap with the other 4 queries.
  const forecastRecordsPromise = getForecastsByRegions(session.regions);
  const [cashFlowEntries, costAnalysisEntries, forecastRecords, suppliers, unitCostQuotes, forecastCashFlowRows, contracts] =
    await Promise.all([
      listCashFlowEntries(),
      listCostAnalysisEntries(),
      forecastRecordsPromise,
      listSuppliers(),
      listUnitCostQuotes(),
      forecastRecordsPromise.then(enrichForecastRecordsForCashFlow),
      listContractsBySessionRegions(session.regions),
    ]);
  const forecastContractCoverage = computeForecastContractCoverage(forecastCashFlowRows, contracts);
  const fcSupplierNames = [
    ...new Set(
      suppliers.filter((s) => s.isActive).map((s) => s.name.trim()).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Supply Chain Management" : "供应链管理"}
      description={language === "en" ? "Suppliers, contracts and cost control in one module." : "将供应商、合同、成本控制整合到同一模块。"}
      moduleTabs={<SupplyChainSubnav language={language} />}
    >
      <Suspense
        fallback={
          <div className="mt-4 h-40 animate-pulse rounded-2xl border border-app-border/80 bg-app-surface/80" />
        }
      >
        <CostControlPanel
          language={language}
          cashFlowEntries={cashFlowEntries}
          costAnalysisEntries={costAnalysisEntries}
          forecastCashFlowRows={forecastCashFlowRows}
          forecastContractCoverage={forecastContractCoverage}
          fcSupplierNames={fcSupplierNames}
          suppliers={suppliers}
          landedCostConsolidateSnapshots={[]}
          unitCostQuotes={unitCostQuotes}
        />
      </Suspense>
    </AppShell>
  );
}

