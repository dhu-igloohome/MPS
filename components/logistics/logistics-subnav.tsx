"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Language } from "@/lib/i18n";

function activeSubnavHref(pathname: string, items: Array<{ href: string }>): string | null {
  const hits = items.filter((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
  if (hits.length === 0) return null;
  return hits.reduce((a, b) => (a.href.length >= b.href.length ? a : b)).href;
}

export function LogisticsSubnav({ language }: { language: Language }) {
  const pathname = usePathname() || "";
  const items = [
    { href: "/logistics-progress", label: language === "en" ? "Logistics Progress" : "物流进度" },
    {
      href: "/logistics-progress/shipping-report",
      label: language === "en" ? "Shipping Report" : "Shipping Report",
    },
    {
      href: "/logistics-progress/inventory-global",
      label: language === "en" ? "Inventory Global" : "Inventory Global",
    },
    {
      href: "/logistics-progress/landed-cost-consolidate",
      label: language === "en" ? "Landed cost consolidate" : "到岸成本汇总",
    },
    {
      href: "/logistics-progress/order-fulfillments",
      label: language === "en" ? "Order fulfillments" : "订单履约",
    },
  ];
  const activeHref = activeSubnavHref(pathname, items);
  return (
    <div className="app-subnav p-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`app-subnav-link ${activeHref === item.href ? "app-subnav-link-active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
