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
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Users,
} from "lucide-react";

const NAV_COLLAPSED_STORAGE_KEY = "mps-nav-collapsed";

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
  /** Whole-sidebar icon-only rail mode, remembered per browser. Starts expanded on the server
   * render so there's no hydration mismatch; a returning user's collapsed choice applies right
   * after mount. */
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Deferred a tick so the initial (expanded) mount commits before this reads the
    // returning user's stored preference, matching this file's existing manuallyClosed/
    // manuallyOpened sync pattern below rather than setting state synchronously in-effect.
    queueMicrotask(() => {
      if (localStorage.getItem(NAV_COLLAPSED_STORAGE_KEY) === "1") setCollapsed(true);
    });
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(NAV_COLLAPSED_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

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
    <div className="flex flex-col gap-5 md:flex-row md:items-start md:gap-8 lg:gap-10">
        <nav
          className={`w-full shrink-0 ${collapsed ? "md:w-14" : "md:w-56 lg:w-60"}`}
          aria-label="Main navigation"
        >
          <div className="hidden justify-end pb-1.5 md:flex">
            <button
              type="button"
              onClick={toggleCollapsed}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] outline-none hover:bg-gray-100 hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/40"
              aria-label={en ? (collapsed ? "Expand navigation" : "Collapse navigation") : collapsed ? "展开导航" : "收起导航"}
              title={en ? (collapsed ? "Expand navigation" : "Collapse navigation") : collapsed ? "展开导航" : "收起导航"}
            >
              {collapsed ? (
                <PanelLeftOpen size={16} strokeWidth={1.75} />
              ) : (
                <PanelLeftClose size={16} strokeWidth={1.75} />
              )}
            </button>
          </div>
          <ul className="max-h-[min(70dvh,calc(100dvh-12rem))] space-y-1 overflow-y-auto overscroll-contain rounded-2xl bg-[#F3F4F6]/80 p-3 [scrollbar-width:thin] md:max-h-[min(100dvh-9rem,calc(100vh-9rem))]">
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
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={`relative flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm font-medium tracking-tight transition-colors ${
                        collapsed ? "md:justify-center md:gap-0 md:px-0" : ""
                      } ${
                        on
                          ? "bg-white font-semibold text-[#111827]"
                          : "text-[#4B5563] hover:bg-gray-100 hover:text-[#111827]"
                      }`}
                    >
                      {on ? <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[var(--app-accent)]" /> : null}
                      {Icon ? <Icon size={16} strokeWidth={1.5} className="shrink-0" /> : null}
                      <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
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
                      collapsed ? "md:justify-center" : ""
                    } ${
                      on ? "bg-white font-semibold text-[#111827]" : "text-[#4B5563] hover:bg-gray-100 hover:text-[#111827]"
                    }`}
                  >
                    {on ? <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-[var(--app-accent)]" /> : null}
                    <button
                      type="button"
                      className={`flex shrink-0 items-center justify-center rounded-l-lg px-1.5 text-[#6B7280] outline-none hover:bg-black/[0.04] hover:text-[#111827] focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/40 ${
                        collapsed ? "md:hidden" : ""
                      }`}
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
                      title={collapsed ? item.label : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={`min-w-0 flex-1 py-2.5 pr-3 text-sm font-medium tracking-tight ${
                        collapsed ? "md:flex md:items-center md:justify-center md:px-0" : ""
                      } ${on ? "text-[#111827]" : "text-[#4B5563]"}`}
                    >
                      <span className={`inline-flex items-center gap-2.5 ${collapsed ? "md:gap-0" : ""}`}>
                        {Icon ? <Icon size={16} strokeWidth={1.5} className="shrink-0" /> : null}
                        <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
                      </span>
                    </Link>
                  </div>
                  <ul
                    id={subListId}
                    hidden={!expanded}
                    className={`mt-1 space-y-0.5 border-l border-gray-200/90 py-0.5 pl-3 ml-4 ${
                      collapsed ? "md:hidden" : ""
                    }`}
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
  );
}
