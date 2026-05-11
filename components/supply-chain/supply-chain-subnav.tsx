"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Calculator, FileText } from "lucide-react";

import type { Language } from "@/lib/i18n";

type SupplyChainSubnavProps = {
  language: Language;
};

export function SupplyChainSubnav({ language }: SupplyChainSubnavProps) {
  const pathname = usePathname() || "";
  const items = [
    {
      href: "/supply-chain/cost-control",
      label: language === "en" ? "Cost Control" : "成本控制",
      Icon: Calculator,
    },
    {
      href: "/supply-chain/contracts",
      label: language === "en" ? "Contracts" : "合同管理",
      Icon: FileText,
    },
    {
      href: "/supply-chain/suppliers",
      label: language === "en" ? "Suppliers" : "供应商管理",
      Icon: Building2,
    },
  ] as const;

  const isOn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      className="flex w-full flex-col gap-1 sm:flex-row sm:rounded-xl sm:bg-zinc-200/60 sm:p-1"
      aria-label={language === "en" ? "Supply chain sections" : "供应链分区"}
    >
      {items.map(({ href, label, Icon }) => {
        const on = isOn(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-[2.75rem] min-w-0 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all sm:min-h-0 sm:py-2 ${
              on
                ? "bg-white text-[#111827] shadow-sm ring-1 ring-black/[0.06]"
                : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827] sm:hover:bg-white/50"
            } `}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
            <span className="truncate whitespace-nowrap">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
