"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type ShellNavItem = { href: string; label: string };

type AppShellNavProps = {
  items: ShellNavItem[];
  children: ReactNode;
};

function pathMatches(pathname: string, href: string) {
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function AppShellNav({ items, children }: AppShellNavProps) {
  const pathname = usePathname() || "";

  const pill =
    "rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 sm:py-2";
  const idle =
    "border border-transparent text-foreground/85 hover:border-app-border hover:bg-app-surface hover:text-app-accent";
  const active =
    "border border-app-accent/25 bg-app-accent-soft text-app-accent shadow-sm";

  return (
    <>
      <nav
        className="-mx-1 mb-1 flex gap-2 overflow-x-auto px-1 pb-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Main navigation"
      >
        {items.map((item) => {
          const on = pathMatches(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${pill} shrink-0 ${on ? active : idle}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6 lg:gap-8">
        <nav
          className="hidden w-52 shrink-0 md:block lg:w-56"
          aria-label="Main navigation"
        >
          <ul className="space-y-1 rounded-2xl border border-app-border/90 bg-app-surface/95 p-3 shadow-sm backdrop-blur-sm">
            {items.map((item) => {
              const on = pathMatches(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block ${pill} ${on ? active : idle}`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="min-w-0 flex-1 space-y-4">{children}</section>
      </div>
    </>
  );
}
