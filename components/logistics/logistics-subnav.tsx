"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Language } from "@/lib/i18n";

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
