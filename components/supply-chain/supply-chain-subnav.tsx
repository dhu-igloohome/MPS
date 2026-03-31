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
  const isOn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="app-subnav p-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`app-subnav-link ${isOn(item.href) ? "app-subnav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

