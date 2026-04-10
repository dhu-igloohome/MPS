"use client";

import { useSearchParams } from "next/navigation";

import { CashFlowPanel } from "@/components/cost-control/cash-flow-panel";
import { CostAnalysisPanel } from "@/components/cost-control/cost-analysis-panel";
import { CostControlSubnav } from "@/components/cost-control/cost-control-subnav";
import type { Language } from "@/lib/i18n";
import type { CashFlowEntry, CostAnalysisEntry, ForecastCashFlowRow } from "@/lib/types";

type CostControlPanelProps = {
  language: Language;
  cashFlowEntries: CashFlowEntry[];
  costAnalysisEntries: CostAnalysisEntry[];
  forecastCashFlowRows: ForecastCashFlowRow[];
  fcSupplierNames: string[];
};

const COPY = {
  en: {
    costAnalysis: "Cost analysis",
    cashFlow: "Cash flow analysis",
  },
  zh: {
    costAnalysis: "成本分析",
    cashFlow: "现金流分析",
  },
};

export function CostControlPanel({
  language,
  cashFlowEntries,
  costAnalysisEntries,
  forecastCashFlowRows,
  fcSupplierNames,
}: CostControlPanelProps) {
  const t = COPY[language];
  const searchParams = useSearchParams();
  const section = searchParams.get("tab") === "cashflow" ? "cashflow" : "cost";

  return (
    <div className="mt-4 space-y-4">
      <CostControlSubnav language={language} active={section} />

      <section
        className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm"
        role="tabpanel"
        aria-label={section === "cost" ? t.costAnalysis : t.cashFlow}
      >
        {section === "cost" ? (
          <>
            <h3 className="mb-2 text-base font-semibold text-foreground">{t.costAnalysis}</h3>
            <CostAnalysisPanel language={language} initialEntries={costAnalysisEntries} />
          </>
        ) : (
          <>
            <h3 className="mb-2 text-base font-semibold text-foreground">{t.cashFlow}</h3>
            <CashFlowPanel
              language={language}
              initialEntries={cashFlowEntries}
              costAnalysisEntries={costAnalysisEntries}
              forecastCashFlowRows={forecastCashFlowRows}
              fcSupplierNames={fcSupplierNames}
            />
          </>
        )}
      </section>
    </div>
  );
}
