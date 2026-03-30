"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Language } from "@/lib/i18n";

type SupplyChainSubnavProps = {
  language: Language;
};

export function SupplyChainSubnav({ language }: SupplyChainSubnavProps) {
  const pathname = usePathname() || "";
  const items = [
    { href: "/supply-chain/suppliers", label: language === "en" ? "Suppliers" : "供应商管理" },
    { href: "/supply-chain/contracts", label: language === "en" ? "Contracts" : "合同管理" },
    { href: "/supply-chain/cost-control", label: language === "en" ? "Cost Control" : "成本控制" },
  ];
  const pill = "rounded-xl border px-3 py-2 text-sm font-medium transition-colors";
  const isOn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="rounded-2xl border border-app-border/90 bg-app-surface p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${pill} ${
              isOn(item.href)
                ? "border-app-accent/30 bg-app-accent-soft text-app-accent"
                : "border-app-border text-foreground/85 hover:bg-app-accent-soft"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

