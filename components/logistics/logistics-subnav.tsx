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
    <div className="rounded-2xl border border-app-border/90 bg-app-surface p-3 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl border px-3 py-2 text-sm font-medium transition-colors ${
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
