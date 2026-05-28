"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { BarChart3, Building2, Calculator, ChevronRight, Coins, FileText, Landmark, Settings } from "lucide-react";

import type { Language } from "@/lib/i18n";
import type { LucideIcon } from "lucide-react";

type SupplyChainSubnavProps = {
  language: Language;
};

type SupplyChainSubnavChild = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

type SupplyChainSubnavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  children?: SupplyChainSubnavChild[];
};

export function SupplyChainSubnav({ language }: SupplyChainSubnavProps) {
  const pathname = usePathname() || "";
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab");
  const costControlItem: SupplyChainSubnavItem = {
    href: "/supply-chain/cost-control",
    label: language === "en" ? "Cost Control" : "成本控制",
    Icon: Calculator,
    children: [
      {
        href: "/supply-chain/cost-control",
        label: language === "en" ? "Cost analysis" : "成本分析",
        Icon: BarChart3,
      },
      {
        href: "/supply-chain/cost-control?tab=cashflow",
        label: language === "en" ? "Cash flow analysis" : "现金流分析",
        Icon: Landmark,
      },
      {
        href: "/supply-chain/cost-control/unit-cost",
        label: language === "en" ? "Unit cost" : "单位成本",
        Icon: Coins,
      },
    ],
  };
  const contractsItem: SupplyChainSubnavItem = {
    href: "/supply-chain/contracts",
    label: language === "en" ? "Contracts" : "合同管理",
    Icon: FileText,
  };
  const suppliersItem: SupplyChainSubnavItem = {
    href: "/supply-chain/suppliers",
    label: language === "en" ? "Suppliers" : "供应商管理",
    Icon: Building2,
  };
  const buyerEntitiesItem: SupplyChainSubnavItem = {
    href: "/supply-chain/buyer-entities",
    label: language === "en" ? "Buyer Entities" : "需方信息",
    Icon: Settings,
  };

  const isOn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isCostControlChildOn = (href: string) => {
    if (href.includes("?tab=cashflow")) {
      return pathname === "/supply-chain/cost-control" && activeTab === "cashflow";
    }
    if (href === "/supply-chain/cost-control") {
      return pathname === "/supply-chain/cost-control" && activeTab !== "cashflow";
    }
    return isOn(href);
  };
  const [costExpanded, setCostExpanded] = useState(false);

  useEffect(() => {
    // Keep Cost Control expanded while user is on any cost-control route.
    if (isOn(costControlItem.href)) setCostExpanded(true);
  }, [pathname]);

  const onCost = isOn(costControlItem.href);
  const onContracts = isOn(contractsItem.href);
  const onSuppliers = isOn(suppliersItem.href);
  const onBuyerEntities = isOn(buyerEntitiesItem.href);
  const subListId = "supply-sub-cost-control";

  return (
    <nav
      className="w-full rounded-xl bg-zinc-200/60 p-1"
      aria-label={language === "en" ? "Supply chain sections" : "供应链分区"}
    >
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-4">
        <div
          className={`flex min-h-[2.75rem] min-w-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium transition-all ${
            onCost
              ? "bg-white text-[#111827] shadow-sm ring-1 ring-black/[0.06]"
              : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827] sm:hover:bg-white/50"
          }`}
        >
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6B7280] hover:bg-black/[0.04] hover:text-[#111827]"
            aria-controls={subListId}
            aria-label={
              costExpanded
                ? language === "en"
                  ? `Collapse ${costControlItem.label}`
                  : `收起${costControlItem.label}`
                : language === "en"
                  ? `Expand ${costControlItem.label}`
                  : `展开${costControlItem.label}`
            }
            onClick={() => setCostExpanded((v) => !v)}
          >
            <ChevronRight
              className={`h-4 w-4 transition-transform ${costExpanded ? "rotate-90" : ""}`}
              strokeWidth={1.75}
              aria-hidden
            />
          </button>
          <Link
            href={costControlItem.href}
            aria-current={onCost ? "page" : undefined}
            className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1"
          >
            <costControlItem.Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
            <span className="truncate whitespace-nowrap">{costControlItem.label}</span>
          </Link>
        </div>

        <Link
          href={contractsItem.href}
          aria-current={onContracts ? "page" : undefined}
          className={`flex min-h-[2.75rem] min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
            onContracts
              ? "bg-white text-[#111827] shadow-sm ring-1 ring-black/[0.06]"
              : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827] sm:hover:bg-white/50"
          } `}
        >
          <contractsItem.Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
          <span className="truncate whitespace-nowrap">{contractsItem.label}</span>
        </Link>

        <Link
          href={suppliersItem.href}
          aria-current={onSuppliers ? "page" : undefined}
          className={`flex min-h-[2.75rem] min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
            onSuppliers
              ? "bg-white text-[#111827] shadow-sm ring-1 ring-black/[0.06]"
              : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827] sm:hover:bg-white/50"
          } `}
        >
          <suppliersItem.Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
          <span className="truncate whitespace-nowrap">{suppliersItem.label}</span>
        </Link>

        <Link
          href={buyerEntitiesItem.href}
          aria-current={onBuyerEntities ? "page" : undefined}
          className={`flex min-h-[2.75rem] min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
            onBuyerEntities
              ? "bg-white text-[#111827] shadow-sm ring-1 ring-black/[0.06]"
              : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827] sm:hover:bg-white/50"
          } `}
        >
          <buyerEntitiesItem.Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
          <span className="truncate whitespace-nowrap">{buyerEntitiesItem.label}</span>
        </Link>
      </div>

      <ul
        id={subListId}
        hidden={!costExpanded}
        className="mt-1 grid grid-cols-1 gap-1 border-t border-zinc-300/70 pt-1 sm:grid-cols-3"
      >
        {costControlItem.children?.map((child) => {
          const ChildIcon = child.Icon;
          const childOn = isCostControlChildOn(child.href);
          return (
            <li key={child.href}>
              <Link
                href={child.href}
                aria-current={childOn ? "page" : undefined}
                className={`flex min-h-[2.25rem] items-center justify-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                  childOn
                    ? "bg-white text-[var(--app-accent)] shadow-sm ring-1 ring-black/[0.05]"
                    : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827]"
                }`}
              >
                <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={1.8} aria-hidden />
                <span className="truncate">{child.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
