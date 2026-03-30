"use client";

import { useState } from "react";

import { CashFlowPanel } from "@/components/cost-control/cash-flow-panel";
import type { Language } from "@/lib/i18n";
import type { CashFlowEntry } from "@/lib/types";

type CostControlPanelProps = {
  language: Language;
  cashFlowEntries: CashFlowEntry[];
};

const COPY = {
  en: {
    costAnalysis: "Cost analysis",
    cashFlow: "Cash flow analysis",
    costPlaceholder:
      "Connect your Excel logic here: cost breakdowns, margins, and comparisons. Share column headers and rules when ready.",
    cashPlaceholder:
      "Connect your Excel logic here: inflows, outflows, and period balances. Share column headers and rules when ready.",
  },
  zh: {
    costAnalysis: "成本分析",
    cashFlow: "现金流分析",
    costPlaceholder:
      "此处将对接你 Excel 中的成本逻辑（分项、毛利、对比等）。准备好后可提供表头与计算规则。",
    cashPlaceholder:
      "此处将对接你 Excel 中的现金流逻辑（流入、流出、期间余额等）。准备好后可提供表头与计算规则。",
  },
};

export function CostControlPanel({ language, cashFlowEntries }: CostControlPanelProps) {
  const t = COPY[language];
  const [section, setSection] = useState<"cost" | "cashflow">("cost");

  const tabBtn =
    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-app-accent/40";
  const inactive = "border-app-border bg-app-surface text-foreground/90 hover:bg-app-accent-soft";
  const active = "border-app-accent/40 bg-app-accent-soft text-app-accent shadow-sm";

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={language === "en" ? "Cost control sections" : "成本控制板块"}>
        <button
          id="tab-cost"
          type="button"
          role="tab"
          aria-selected={section === "cost"}
          className={`${tabBtn} ${section === "cost" ? active : inactive}`}
          onClick={() => setSection("cost")}
        >
          {t.costAnalysis}
        </button>
        <button
          id="tab-cash"
          type="button"
          role="tab"
          aria-selected={section === "cashflow"}
          className={`${tabBtn} ${section === "cashflow" ? active : inactive}`}
          onClick={() => setSection("cashflow")}
        >
          {t.cashFlow}
        </button>
      </div>

      <section
        className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm"
        role="tabpanel"
        aria-labelledby={section === "cost" ? "tab-cost" : "tab-cash"}
      >
        {section === "cost" ? (
          <>
            <h3 className="text-base font-semibold text-foreground">{t.costAnalysis}</h3>
            <p className="mt-3 text-sm leading-relaxed text-app-muted">{t.costPlaceholder}</p>
          </>
        ) : (
          <>
            <h3 className="mb-2 text-base font-semibold text-foreground">{t.cashFlow}</h3>
            <CashFlowPanel language={language} initialEntries={cashFlowEntries} />
          </>
        )}
      </section>
    </div>
  );
}
