"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Language } from "@/lib/i18n";
import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  ClipboardList,
  Factory,
  PackageSearch,
  ShieldCheck,
  Users,
} from "lucide-react";

export type ShellNavItem = {
  href: string;
  label: string;
  icon?: "cockpit" | "forecast" | "order" | "supply" | "logistics" | "npi" | "quality" | "cost" | "users";
  children?: Array<{ href: string; label: string }>;
};

type AppShellNavProps = {
  items: ShellNavItem[];
  children: ReactNode;
  language?: Language;
};

function pathMatches(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

/** Among sibling nav children, pick the longest href that matches pathname (exact or prefix). */
function activeChildHref(pathname: string, children: Array<{ href: string }>): string | null {
  const hits = children.filter((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
  if (hits.length === 0) return null;
  return hits.reduce((a, b) => (a.href.length >= b.href.length ? a : b)).href;
}

const ICONS = {
  cockpit: BarChart3,
  forecast: ClipboardList,
  order: BriefcaseBusiness,
  supply: Factory,
  logistics: Boxes,
  npi: PackageSearch,
  quality: ShieldCheck,
  cost: BarChart3,
  users: Users,
} as const;

export function AppShellNav({ items, children, language }: AppShellNavProps) {
  const pathname = usePathname() || "";
  const en = language === "en";
  const onOrderProgressModule =
    pathname === "/order-progress" ||
    pathname === "/mass-production-kanban" ||
    pathname === "/order-progress/production-management";

  const orderProgressNavItem = items.find((i) => i.href === "/order-progress");
  const orderProgressSubpages = orderProgressNavItem?.children ?? [];
  const orderProgressActiveChild =
    orderProgressSubpages.length > 0 ? activeChildHref(pathname, orderProgressSubpages) : null;

  const mobilePill =
    "shrink-0 rounded-lg border border-transparent px-3.5 py-2 text-sm font-medium tracking-tight text-[#4B5563] transition-colors duration-150 hover:bg-gray-100";
  const mobileActive =
    "border-[rgba(238,100,84,0.18)] bg-[var(--app-accent-soft)] text-[var(--app-accent)]";

  return (
    <>
      <nav
        className="-mx-1 mb-2 flex gap-2 overflow-x-auto px-1 pb-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Main navigation"
      >
        {items.map((item) => {
          const on =
            pathMatches(pathname, item.href) ||
            Boolean(item.children?.some((child) => pathMatches(pathname, child.href)));
          const Icon = item.icon ? ICONS[item.icon] : null;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${mobilePill} ${on ? mobileActive : ""}`}
            >
              <span className="inline-flex items-center gap-2">
                {Icon ? <Icon size={16} strokeWidth={1.5} /> : null}
                <span>{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {language && onOrderProgressModule && orderProgressSubpages.length > 0 ? (
        <div
          className="-mx-1 mb-3 flex flex-wrap gap-2 px-1"
          aria-label={en ? "Order Progress sections" : "订单进度子页面"}
        >
          {orderProgressSubpages.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={`${mobilePill} ${orderProgressActiveChild === child.href ? mobileActive : ""}`}
            >
              {child.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8 lg:gap-10">
        <nav
          className="hidden w-56 shrink-0 md:block lg:w-60"
          aria-label="Main navigation"
        >
          <ul className="space-y-1 rounded-2xl bg-[#F3F4F6]/80 p-3">
            {items.map((item) => {
              const on =
                pathMatches(pathname, item.href) ||
                Boolean(item.children?.some((child) => pathMatches(pathname, child.href)));
              const Icon = item.icon ? ICONS[item.icon] : null;
              return (
                <li key={item.href} className="group relative">
                  <Link
                    href={item.href}
                    className={`relative block rounded-lg px-4 py-2.5 text-sm font-medium tracking-tight transition-colors ${
                      on
                        ? "bg-white font-semibold text-[#111827]"
                        : "text-[#4B5563] hover:bg-gray-100 hover:text-[#111827]"
                    }`}
                  >
                    {on ? <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[var(--app-accent)]" /> : null}
                    <span className="inline-flex items-center gap-2.5">
                      {Icon ? <Icon size={16} strokeWidth={1.5} /> : null}
                      <span>{item.label}</span>
                    </span>
                  </Link>
                  {item.children?.length ? (
                    <div className="pointer-events-none absolute left-full top-0 z-20 ml-3 w-56 max-h-[min(70vh,24rem)] overflow-y-auto rounded-xl border border-gray-100 bg-white p-2 opacity-0 shadow-[0_8px_24px_rgba(17,24,39,0.08)] transition-all duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
                      {item.children.map((child) => {
                        const childOn = activeChildHref(pathname, item.children ?? []) === child.href;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={`mb-1 block rounded-lg px-3 py-2 text-sm tracking-tight transition-colors last:mb-0 ${
                              childOn
                                ? "bg-[var(--app-accent-soft)] font-semibold text-[var(--app-accent)]"
                                : "text-[#4B5563] hover:bg-gray-50 hover:text-[#111827]"
                            }`}
                          >
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="min-w-0 flex-1 space-y-5">{children}</section>
      </div>
    </>
  );
}
