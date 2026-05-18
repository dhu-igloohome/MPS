"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutGrid, Settings2 } from "lucide-react";

import type { Language } from "@/lib/i18n";

type OrderProgressSubnavProps = {
  language: Language;
};

const ORDER_PROGRESS_ROUTES = [
  { href: "/order-progress", en: "Order lines", zh: "订单行" },
  { href: "/mass-production-kanban", en: "Mass production Kanban", zh: "量产看板" },
  { href: "/order-progress/production-management", en: "Production management", zh: "生产管理" },
] as const;

function activeHref(pathname: string): string | null {
  const hits = ORDER_PROGRESS_ROUTES.filter(
    (r) => pathname === r.href || pathname.startsWith(`${r.href}/`),
  );
  if (hits.length === 0) return null;
  return hits.reduce((a, b) => (a.href.length >= b.href.length ? a : b)).href;
}

export function OrderProgressSubnav({ language }: OrderProgressSubnavProps) {
  const pathname = usePathname() || "";
  const current = activeHref(pathname);
  const en = language === "en";

  const items = [
    {
      href: ORDER_PROGRESS_ROUTES[0].href,
      label: en ? ORDER_PROGRESS_ROUTES[0].en : ORDER_PROGRESS_ROUTES[0].zh,
      Icon: ClipboardList,
    },
    {
      href: ORDER_PROGRESS_ROUTES[1].href,
      label: en ? ORDER_PROGRESS_ROUTES[1].en : ORDER_PROGRESS_ROUTES[1].zh,
      Icon: LayoutGrid,
    },
    {
      href: ORDER_PROGRESS_ROUTES[2].href,
      label: en ? ORDER_PROGRESS_ROUTES[2].en : ORDER_PROGRESS_ROUTES[2].zh,
      Icon: Settings2,
    },
  ];

  return (
    <nav
      className="w-full rounded-xl bg-zinc-200/60 p-1"
      aria-label={en ? "Order Progress sections" : "订单进度分区"}
    >
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {items.map(({ href, label, Icon }) => {
          const on = current === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-[2.75rem] min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                on
                  ? "bg-white text-[#111827] shadow-sm ring-1 ring-black/[0.06]"
                  : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827] sm:hover:bg-white/50"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
              <span className="truncate whitespace-nowrap">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
