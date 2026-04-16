import Image from "next/image";
import { cookies } from "next/headers";

import { AppShellNav, type ShellNavItem } from "@/components/shared/app-shell-nav";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { LogoutButton } from "@/components/shared/logout-button";
import { normalizeLanguage } from "@/lib/i18n";
import { SessionPayload } from "@/lib/types";

import { AutoHideHeader } from "@/components/shared/auto-hide-header";

type AppShellProps = {
  session: SessionPayload;
  title: string;
  description: string;
  children: React.ReactNode;
};

export async function AppShell({ session, title, description, children }: AppShellProps) {
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  const navText = {
    cockpit: language === "en" ? "Dashboard" : "仪表盘",
    forecastInput: language === "en" ? "Forecast Input" : "Forecast 填报",
    orderProgress: language === "en" ? "Order Progress" : "订单进度",
    orderProgressSubLines: language === "en" ? "Order lines" : "订单行",
    massProductionKanban: language === "en" ? "Mass production Kanban" : "量产看板",
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
          ? [{ href: "/admin/products", label: navText.productDatabase }]
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
        <div className="mx-auto flex w-full max-w-[1520px] flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-8 lg:px-10 lg:py-5">
          <div className="min-w-0 space-y-1.5">
            <Image src="/igloo-logo-pinge.svg" alt="Igloo logo" width={87} height={24} priority />
            <p className="text-xs text-app-subtle sm:text-sm">
              Igloo Foretracker | Igloo 订单追踪系统
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2.5 sm:gap-3">
            <span className="max-w-[12rem] truncate text-xs text-app-muted sm:max-w-none sm:text-sm">
              <span className="hidden sm:inline">{session.displayName}</span>
              <span className="sm:hidden">{session.displayName.split(/\s+/)[0] || session.displayName}</span>
              <span className="text-app-subtle"> ({session.role})</span>
            </span>
            <LanguageToggle language={language} />
            <LogoutButton />
          </div>
        </div>
      </AutoHideHeader>

      <div className="mx-auto w-full max-w-[1520px] px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
        <AppShellNav items={navItems} language={language}>
          <div className="app-panel p-5 sm:p-6">
            <h2 className="text-xl font-semibold tracking-tight text-[#111827] sm:text-2xl">{title}</h2>
            <p className="mt-1.5 text-sm text-[#4B5563]">{description}</p>
          </div>
          {children}
        </AppShellNav>
      </div>
    </main>
  );
}
