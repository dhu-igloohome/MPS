"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Language } from "@/lib/i18n";
import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  ChevronRight,
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

/** True when this item or any of its children matches the current path (same rule as nav highlight). */
function isInNavBranch(pathname: string, item: ShellNavItem): boolean {
  if (pathMatches(pathname, item.href)) return true;
  return Boolean(item.children?.some((child) => pathMatches(pathname, child.href)));
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
  /** While on a branch, user may collapse; when browsing elsewhere, clear so next visit defaults open again. */
  const [manuallyClosed, setManuallyClosed] = useState<Set<string>>(() => new Set());
  /** When not on a branch, user may expand to peek at sub-links without navigating yet. */
  const [manuallyOpened, setManuallyOpened] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setManuallyClosed((prev) => {
      const next = new Set(prev);
      for (const href of prev) {
        const item = items.find((i) => i.href === href);
        if (!item?.children?.length) {
          next.delete(href);
          continue;
        }
        if (!isInNavBranch(pathname, item)) next.delete(href);
      }
      return next;
    });
    setManuallyOpened((prev) => {
      const next = new Set(prev);
      for (const href of prev) {
        const item = items.find((i) => i.href === href);
        if (!item?.children?.length) {
          next.delete(href);
          continue;
        }
        if (isInNavBranch(pathname, item)) next.delete(href);
      }
      return next;
    });
  }, [pathname, items]);

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

  function isGroupExpanded(item: ShellNavItem): boolean {
    if (!item.children?.length) return false;
    const inBranch = isInNavBranch(pathname, item);
    if (inBranch && !manuallyClosed.has(item.href)) return true;
    if (!inBranch && manuallyOpened.has(item.href)) return true;
    return false;
  }

  function toggleGroup(itemHref: string) {
    const item = items.find((i) => i.href === itemHref);
    if (!item?.children?.length) return;
    const inBranch = isInNavBranch(pathname, item);
    const expanded = isGroupExpanded(item);
    if (inBranch && expanded) {
      setManuallyClosed((s) => new Set(s).add(itemHref));
    } else if (inBranch && !expanded) {
      setManuallyClosed((s) => {
        const n = new Set(s);
        n.delete(itemHref);
        return n;
      });
    } else if (!inBranch && expanded) {
      setManuallyOpened((s) => {
        const n = new Set(s);
        n.delete(itemHref);
        return n;
      });
    } else {
      setManuallyOpened((s) => new Set(s).add(itemHref));
    }
  }

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
          <ul className="max-h-[min(100dvh-9rem,calc(100vh-9rem))] space-y-1 overflow-y-auto overscroll-contain rounded-2xl bg-[#F3F4F6]/80 p-3 [scrollbar-width:thin]">
            {items.map((item) => {
              const on = isInNavBranch(pathname, item);
              const Icon = item.icon ? ICONS[item.icon] : null;
              const hasChildren = Boolean(item.children?.length);
              const expanded = hasChildren ? isGroupExpanded(item) : false;

              if (!hasChildren) {
                return (
                  <li key={item.href}>
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
                  </li>
                );
              }

              const subListId = `nav-sub-${item.href.slice(1).replace(/\//g, "-") || "root"}`;
              const ariaExpanded: "true" | "false" = expanded ? "true" : "false";

              return (
                <li key={item.href}>
                  <div
                    className={`relative flex items-stretch rounded-lg transition-colors ${
                      on ? "bg-white font-semibold text-[#111827]" : "text-[#4B5563] hover:bg-gray-100 hover:text-[#111827]"
                    }`}
                  >
                    {on ? <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[var(--app-accent)]" /> : null}
                    <button
                      type="button"
                      className="flex shrink-0 items-center justify-center rounded-l-lg px-1.5 text-[#6B7280] outline-none hover:bg-black/[0.04] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/40"
                      aria-expanded={ariaExpanded}
                      aria-controls={subListId}
                      aria-label={
                        expanded
                          ? en
                            ? `Collapse ${item.label}`
                            : `收起${item.label}`
                          : en
                            ? `Expand ${item.label}`
                            : `展开${item.label}`
                      }
                      onClick={() => toggleGroup(item.href)}
                    >
                      <ChevronRight
                        size={16}
                        strokeWidth={1.75}
                        className={`transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
                        aria-hidden
                      />
                    </button>
                    <Link
                      href={item.href}
                      className={`min-w-0 flex-1 py-2.5 pr-3 text-sm font-medium tracking-tight ${
                        on ? "text-[#111827]" : "text-[#4B5563]"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5">
                        {Icon ? <Icon size={16} strokeWidth={1.5} /> : null}
                        <span>{item.label}</span>
                      </span>
                    </Link>
                  </div>
                  <ul
                    id={subListId}
                    hidden={!expanded}
                    className="mt-1 space-y-0.5 border-l border-gray-200/90 py-0.5 pl-3 ml-4"
                  >
                    {item.children!.map((child) => {
                      const childOn = activeChildHref(pathname, item.children ?? []) === child.href;
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            className={`block rounded-md py-1.5 pl-2 pr-2 text-sm tracking-tight transition-colors ${
                              childOn
                                ? "bg-[var(--app-accent-soft)] font-semibold text-[var(--app-accent)]"
                                : "text-[#4B5563] hover:bg-gray-100/80 hover:text-[#111827]"
                            }`}
                          >
                            {child.label}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
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
