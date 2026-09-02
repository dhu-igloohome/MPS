"use client";

import Link from "next/link";
import { BarChart3, CalendarRange, Coins, Landmark } from "lucide-react";

import type { Language } from "@/lib/i18n";

const COPY = {
  en: {
    costAnalysis: "Cost analysis",
    cashFlow: "Cash flow analysis",
    unitCost: "Unit cost",
    paymentSchedule: "Payment schedule",
  },
  zh: {
    costAnalysis: "成本分析",
    cashFlow: "现金流分析",
    unitCost: "单位成本",
    paymentSchedule: "付款计划",
  },
};

export type CostControlSubnavActive = "cost" | "cashflow" | "unit" | "payment-schedule";

type Props = {
  language: Language;
  active: CostControlSubnavActive;
};

export function CostControlSubnav({ language, active }: Props) {
  const t = COPY[language];
  const tabs = [
    { key: "unit" as const, href: "/supply-chain/cost-control/unit-cost", label: t.unitCost, Icon: Coins },
    { key: "cashflow" as const, href: "/supply-chain/cost-control?tab=cashflow", label: t.cashFlow, Icon: Landmark },
    {
      key: "payment-schedule" as const,
      href: "/supply-chain/cost-control/payment-schedule",
      label: t.paymentSchedule,
      Icon: CalendarRange,
    },
    { key: "cost" as const, href: "/supply-chain/cost-control", label: t.costAnalysis, Icon: BarChart3 },
  ];

  return (
    <nav
      className="rounded-xl border border-app-border/60 bg-zinc-100/50 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]"
      aria-label={language === "en" ? "Cost control sections" : "成本控制板块"}
    >
      <div className="flex flex-wrap gap-1 sm:flex-nowrap">
        {tabs.map(({ key, href, label, Icon }) => {
          const on = active === key;
          return (
            <Link
              key={key}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-[2.25rem] flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors sm:min-h-0 sm:px-3 sm:text-sm ${
                on
                  ? "bg-white text-app-accent shadow-sm ring-1 ring-black/[0.05]"
                  : "text-foreground/75 hover:bg-white/80 hover:text-foreground"
              } `}
            >
              <Icon className="h-3.5 w-3.5 shrink-0 opacity-90 sm:h-4 sm:w-4" strokeWidth={1.75} aria-hidden />
              <span className="truncate whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
