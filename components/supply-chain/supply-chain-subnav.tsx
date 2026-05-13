"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Calculator, ChevronRight, Coins, FileText } from "lucide-react";

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
      children: [
        {
          href: "/supply-chain/cost-control/unit-cost",
          label: language === "en" ? "Unit cost" : "单位成本",
          Icon: Coins,
        },
      ],
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
  const [opened, setOpened] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    // Keep active branch expanded when navigating.
    const next = new Set<string>();
    for (const item of items) {
      if (item.children?.length && isOn(item.href)) next.add(item.href);
    }
    setOpened((prev) => {
      const merged = new Set(prev);
      for (const href of next) merged.add(href);
      return merged;
    });
  }, [pathname]);

  return (
    <nav
      className="w-full rounded-xl bg-zinc-200/60 p-1"
      aria-label={language === "en" ? "Supply chain sections" : "供应链分区"}
    >
      {items.map(({ href, label, Icon, children }) => {
        const on = isOn(href);
        const hasChildren = Boolean(children?.length);
        const expanded = hasChildren && opened.has(href);
        const subListId = `supply-sub-${href.slice(1).replace(/\//g, "-")}`;

        if (!hasChildren) {
          return (
            <Link
              key={href}
              href={href}
              aria-current={on ? "page" : undefined}
              className={`mb-1 flex min-h-[2.75rem] min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all last:mb-0 ${
                on
                  ? "bg-white text-[#111827] shadow-sm ring-1 ring-black/[0.06]"
                  : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827] sm:hover:bg-white/50"
              } `}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
              <span className="truncate whitespace-nowrap">{label}</span>
            </Link>
          );
        }

        return (
          <div key={href} className="mb-1 last:mb-0">
            <div
              className={`flex min-h-[2.75rem] min-w-0 items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium transition-all ${
                on
                  ? "bg-white text-[#111827] shadow-sm ring-1 ring-black/[0.06]"
                  : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827] sm:hover:bg-white/50"
              }`}
            >
              <button
                type="button"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#6B7280] hover:bg-black/[0.04] hover:text-[#111827]"
                aria-controls={subListId}
                aria-label={
                  expanded
                    ? language === "en"
                      ? `Collapse ${label}`
                      : `收起${label}`
                    : language === "en"
                      ? `Expand ${label}`
                      : `展开${label}`
                }
                onClick={() =>
                  setOpened((prev) => {
                    const next = new Set(prev);
                    if (next.has(href)) next.delete(href);
                    else next.add(href);
                    return next;
                  })
                }
              >
                <ChevronRight
                  className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </button>
              <Link
                href={href}
                aria-current={on ? "page" : undefined}
                className="flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1"
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
                <span className="truncate whitespace-nowrap">{label}</span>
              </Link>
            </div>
            <ul id={subListId} hidden={!expanded} className="mt-1 space-y-1 border-l border-zinc-300/80 pl-4">
              {children.map((child) => {
                const ChildIcon = child.Icon;
                const childOn = isOn(child.href);
                return (
                  <li key={child.href}>
                    <Link
                      href={child.href}
                      aria-current={childOn ? "page" : undefined}
                      className={`flex min-h-[2.25rem] items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
                        childOn
                          ? "bg-white text-[var(--app-accent)] shadow-sm ring-1 ring-black/[0.05]"
                          : "text-[#4B5563] hover:bg-white/70 hover:text-[#111827]"
                      }`}
                    >
                      <ChildIcon className="h-3.5 w-3.5 shrink-0 opacity-90" strokeWidth={1.8} aria-hidden />
                      <span className="truncate">{child.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
