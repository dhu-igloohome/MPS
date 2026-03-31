import Image from "next/image";
import { cookies } from "next/headers";

import { AppShellNav } from "@/components/shared/app-shell-nav";
import { LanguageToggle } from "@/components/shared/language-toggle";
import { LogoutButton } from "@/components/shared/logout-button";
import { normalizeLanguage } from "@/lib/i18n";
import { SessionPayload } from "@/lib/types";

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
    cockpit: language === "en" ? "Cockpit" : "驾驶舱",
    forecastInput: language === "en" ? "Forecast Input" : "Forecast 填报",
    orderProgress: language === "en" ? "Order Progress" : "订单进度",
    supplyChain: language === "en" ? "Supply Chain Management" : "供应链管理",
    logisticsProgress: language === "en" ? "Logistics Progress" : "物流进度",
    npi: language === "en" ? "NPI" : "NPI",
    qualityControl: language === "en" ? "Quality Control" : "质量管理",
    costControl: language === "en" ? "Cost Control" : "成本控制",
    userManagement: language === "en" ? "User Management" : "用户管理",
    productDatabase: language === "en" ? "Product Database" : "产品数据库",
  };

  const navItems = [
    { href: "/dashboard", label: navText.cockpit },
    { href: "/forecast", label: navText.forecastInput },
    { href: "/order-progress", label: navText.orderProgress },
    {
      href: "/supply-chain/suppliers",
      label: navText.supplyChain,
      children: [
        { href: "/supply-chain/suppliers", label: language === "en" ? "Suppliers" : "供应商管理" },
        { href: "/supply-chain/contracts", label: language === "en" ? "Contracts" : "合同管理" },
        { href: "/supply-chain/cost-control", label: language === "en" ? "Cost Control" : "成本控制" },
      ],
    },
    { href: "/logistics-progress", label: navText.logisticsProgress },
    {
      href: "/npi",
      label: navText.npi,
      children: [
        { href: "/npi/bom", label: language === "en" ? "BOM Management" : "BOM 管理" },
        { href: "/npi/tooling", label: language === "en" ? "Tooling & Fixture" : "工装夹具管理" },
        { href: "/npi/ecn", label: language === "en" ? "ECN Management" : "ECN 管理" },
      ],
    },
    {
      href: "/quality-control/test-cases",
      label: navText.qualityControl,
      children: [
        { href: "/quality-control/test-cases", label: language === "en" ? "Test Cases" : "测试用例管理" },
        { href: "/quality-control/certifications", label: language === "en" ? "Certifications" : "认证管理" },
        { href: "/quality-control/ort-reports", label: language === "en" ? "ORT Reports" : "ORT 报告管理" },
        { href: "/quality-control/eight-d", label: language === "en" ? "8D Reports" : "8D 报告管理" },
      ],
    },
    { href: "/cost-control", label: navText.costControl },
    ...(session.role === "super_admin"
      ? [
          { href: "/admin/users", label: navText.userManagement },
          { href: "/admin/products", label: navText.productDatabase },
        ]
      : []),
  ];

  return (
    <main className="min-h-dvh">
      <header className="border-b border-app-border/80 bg-app-surface/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:py-5">
          <div className="min-w-0 space-y-1">
            <Image src="/igloo-logo-pinge.svg" alt="Igloo logo" width={87} height={24} priority />
            <p className="text-xs text-app-muted sm:text-sm">
              Igloo Foretracker | Igloo 订单追踪系统
            </p>
            <h1 className="text-base font-semibold text-foreground sm:text-lg">{title}</h1>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-2 sm:gap-3">
            <span className="max-w-[12rem] truncate text-xs text-app-muted sm:max-w-none sm:text-sm">
              <span className="hidden sm:inline">{session.displayName}</span>
              <span className="sm:hidden">{session.displayName.split(/\s+/)[0] || session.displayName}</span>
              <span className="text-app-muted"> ({session.role})</span>
            </span>
            <LanguageToggle language={language} />
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <AppShellNav items={navItems}>
          <div className="rounded-2xl border border-app-border/90 bg-app-surface/95 p-4 shadow-sm backdrop-blur-sm sm:p-5">
            <h2 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h2>
            <p className="mt-1 text-sm text-app-muted">{description}</p>
          </div>
          {children}
        </AppShellNav>
      </div>
    </main>
  );
}
