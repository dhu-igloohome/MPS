import Image from "next/image";
import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { AppShellNav, type ShellNavItem } from "@/components/shared/app-shell-nav";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { LogoutButton } from "@/components/shared/logout-button";
import { normalizeLanguage } from "@/lib/i18n";
import { SessionPayload } from "@/lib/types";

import { AutoHideHeader } from "@/components/shared/auto-hide-header";

type AppShellProps = {
  session: SessionPayload;
  title: string;
  /** Page subtitle under the title; omit or pass empty to hide (e.g. dense dashboards). */
  description?: string;
  /** Renders on the same row as the title (e.g. compact metadata); keep minimal. */
  headerMeta?: ReactNode;
  /** Renders inside the title card (e.g. module-level tabs) to avoid stacked floating panels. */
  moduleTabs?: ReactNode;
  children: ReactNode;
};

export async function AppShell({ session, title, description, headerMeta, moduleTabs, children }: AppShellProps) {
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  const navText = {
    cockpit: language === "en" ? "Dashboard" : "仪表盘",
    forecastInput: language === "en" ? "Forecast Input" : "Forecast 填报",
    orderProgress: language === "en" ? "Order Progress" : "订单进度",
    orderProgressSubLines: language === "en" ? "Order lines" : "订单行",
    massProductionKanban: language === "en" ? "Mass production Kanban" : "量产看板",
    productionManagement: language === "en" ? "Production management" : "生产管理",
    supplyChain: language === "en" ? "Supply Chain Management" : "供应链管理",
    logisticsProgress: language === "en" ? "Logistics Progress" : "物流进度",
    npi: language === "en" ? "NPI Management" : "NPI 管理",
    qualityControl: language === "en" ? "Quality Control" : "质量管理",
    costControl: language === "en" ? "Cost Control" : "成本控制",
    userManagement: language === "en" ? "User Management" : "用户管理",
    productDatabase: language === "en" ? "Product Database" : "产品数据库",
  };

  const navItems: ShellNavItem[] = [
    { href: "/dashboard", label: navText.cockpit, icon: "cockpit" as const },
    { href: "/forecast", label: navText.forecastInput, icon: "forecast" as const },
    {
      href: "/supply-chain/cost-control",
      label: navText.supplyChain,
      icon: "supply" as const,
      children: [
        { href: "/supply-chain/cost-control", label: language === "en" ? "Cost Control" : "成本控制" },
        { href: "/supply-chain/contracts", label: language === "en" ? "Contracts" : "合同管理" },
        { href: "/supply-chain/suppliers", label: language === "en" ? "Suppliers" : "供应商管理" },
      ],
    },
    {
      href: "/order-progress",
      label: navText.orderProgress,
      icon: "order" as const,
      children: [
        { href: "/order-progress", label: navText.orderProgressSubLines },
        { href: "/mass-production-kanban", label: navText.massProductionKanban },
        { href: "/order-progress/production-management", label: navText.productionManagement },
      ],
    },
    {
      href: "/logistics-progress",
      label: navText.logisticsProgress,
      icon: "logistics" as const,
      children: [
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
      ],
    },
    {
      href: "/npi",
      label: navText.npi,
      icon: "npi" as const,
      children: [
        { href: "/npi/bom", label: language === "en" ? "BOM Management" : "BOM 管理" },
        { href: "/npi/tooling", label: language === "en" ? "Tooling & Fixture" : "工装夹具管理" },
        { href: "/npi/ecn", label: language === "en" ? "ECN Management" : "ECN 管理" },
        { href: "/npi/sop", label: language === "en" ? "SOP Management" : "SOP 管理" },
        ...(session.role === "super_admin"
          ? [
              { href: "/admin/products", label: navText.productDatabase },
              {
                href: "/admin/sku-requests",
                label: language === "en" ? "SKU requests" : "SKU 申请审批",
              },
            ]
          : []),
      ],
    },
    {
      href: "/quality-control/test-cases",
      label: navText.qualityControl,
      icon: "quality" as const,
      children: [
        { href: "/quality-control/test-cases", label: language === "en" ? "Test Cases" : "测试用例管理" },
        { href: "/quality-control/certifications", label: language === "en" ? "Certifications" : "认证管理" },
        { href: "/quality-control/ort-reports", label: language === "en" ? "ORT Reports" : "ORT 报告管理" },
        { href: "/quality-control/eight-d", label: language === "en" ? "8D Reports" : "8D 报告管理" },
      ],
    },
    { href: "/cost-control", label: navText.costControl, icon: "cost" as const },
    ...(session.role === "super_admin"
      ? [
          { href: "/admin/users", label: navText.userManagement, icon: "users" as const },
        ]
      : []),
  ];

  return (
    <main className="min-h-dvh">
      <AutoHideHeader>
        <div className="mx-auto flex w-full flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-8 lg:px-10 lg:py-5 2xl:px-12">
          <div className="min-w-0 space-y-1.5">
            <Image src="/igloo-logo-pinge.svg" alt="Igloo logo" width={87} height={24} priority />
            <p className="text-xs text-app-subtle sm:text-sm">
              Igloo Foretracker | Igloo 订单追踪系统
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="flex min-w-0 items-center gap-2.5 rounded-xl border border-app-border/80 bg-white/95 px-2.5 py-1.5 shadow-sm ring-1 ring-black/[0.03] sm:gap-3 sm:px-3">
              <div
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-app-accent-soft to-white text-xs font-bold text-app-accent ring-1 ring-[rgba(238,100,84,0.2)]"
                aria-hidden
              >
                {(session.displayName.trim()[0] || "U").toUpperCase()}
              </div>
              <div className="min-w-0 max-w-[10rem] sm:max-w-[14rem]">
                <p className="truncate text-sm font-medium text-foreground">
                  <span className="hidden sm:inline">{session.displayName}</span>
                  <span className="sm:hidden">{session.displayName.split(/\s+/)[0] || session.displayName}</span>
                </p>
                <p className="truncate text-[11px] text-app-muted">{session.role}</p>
              </div>
            </div>
            <LanguageToggle language={language} />
            <LogoutButton language={language} />
          </div>
        </div>
      </AutoHideHeader>

      <div className="mx-auto w-full px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10 2xl:px-12">
        <AppShellNav items={navItems} language={language}>
          <div className="app-panel overflow-hidden shadow-[0_1px_0_rgba(15,23,42,0.04)] ring-1 ring-black/[0.04]">
            <div
              className={`px-5 pt-5 sm:px-6 sm:pt-6 ${moduleTabs ? "pb-1" : "pb-5 sm:pb-6"}`}
            >
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <h2 className="min-w-0 flex-1 break-words text-xl font-semibold tracking-tight text-[#111827] sm:text-2xl">
                  {title}
                </h2>
                {headerMeta ? (
                  <div className="min-w-0 max-w-full shrink-0 text-xs text-[#9CA3AF] sm:max-w-[min(100%,22rem)] sm:pt-0.5 sm:text-right">
                    <span className="inline-block max-w-full align-top sm:text-right">{headerMeta}</span>
                  </div>
                ) : null}
              </div>
              {description?.trim() ? (
                <p className="mt-1.5 text-sm leading-relaxed text-[#4B5563]">{description}</p>
              ) : null}
            </div>
            {moduleTabs ? (
              <div className="border-t border-app-border/80 bg-zinc-50/95 px-2 py-2.5 sm:px-3 sm:py-3">
                {moduleTabs}
              </div>
            ) : null}
          </div>
          {children}
        </AppShellNav>
      </div>
    </main>
  );
}
