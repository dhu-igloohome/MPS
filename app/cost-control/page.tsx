import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CostControlPanel } from "@/components/cost-control/cost-control-panel";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listCashFlowEntries, listCostAnalysisEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function CostControlPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const [cashFlowEntries, costAnalysisEntries] = await Promise.all([
    listCashFlowEntries(),
    listCostAnalysisEntries(),
  ]);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Cost Control" : "成本控制"}
      description={
        language === "en"
          ? "Cost analysis and cash flow analysis. Excel-style rules can be wired in next."
          : "成本分析与现金流分析。后续可接入与你 Excel 一致的规则与数据。"
      }
    >
      <CostControlPanel
        language={language}
        cashFlowEntries={cashFlowEntries}
        costAnalysisEntries={costAnalysisEntries}
      />
    </AppShell>
  );
}
