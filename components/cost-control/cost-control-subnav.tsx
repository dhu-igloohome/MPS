"use client";

import Link from "next/link";

import type { Language } from "@/lib/i18n";

const COPY = {
  en: {
    costAnalysis: "Cost analysis",
    cashFlow: "Cash flow analysis",
    unitCost: "Unit cost",
  },
  zh: {
    costAnalysis: "成本分析",
    cashFlow: "现金流分析",
    unitCost: "单位成本",
  },
};

export type CostControlSubnavActive = "cost" | "cashflow" | "unit";

type Props = {
  language: Language;
  active: CostControlSubnavActive;
};

export function CostControlSubnav({ language, active }: Props) {
  const t = COPY[language];
  const tabBtn =
    "rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:ring-2 focus-visible:ring-app-accent/40";
  const inactive = "border-app-border bg-app-surface text-foreground/90 hover:bg-app-accent-soft";
  const activeCls = "border-app-accent/40 bg-app-accent-soft text-app-accent shadow-sm";

  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label={language === "en" ? "Cost control sections" : "成本控制板块"}>
      <Link
        href="/supply-chain/cost-control/unit-cost"
        className={`${tabBtn} ${active === "unit" ? activeCls : inactive}`}
        aria-current={active === "unit" ? "page" : undefined}
      >
        {t.unitCost}
      </Link>
      <Link
        href="/supply-chain/cost-control?tab=cashflow"
        className={`${tabBtn} ${active === "cashflow" ? activeCls : inactive}`}
        aria-current={active === "cashflow" ? "page" : undefined}
      >
        {t.cashFlow}
      </Link>
      <Link
        href="/supply-chain/cost-control"
        className={`${tabBtn} ${active === "cost" ? activeCls : inactive}`}
        aria-current={active === "cost" ? "page" : undefined}
      >
        {t.costAnalysis}
      </Link>
    </div>
  );
}
