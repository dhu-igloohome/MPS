import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LogisticsSubnav } from "@/components/logistics/logistics-subnav";
import { ShippingReportPanel } from "@/components/logistics/shipping-report-panel";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listShippingReports } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ShippingReportPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const entries = await listShippingReports();
  return (
    <AppShell
      session={session}
      title={language === "en" ? "Logistics Progress · Shipping Report" : "物流进度 · Shipping Report"}
      description={
        language === "en"
          ? "Track outbound shipping records and payment split by shipment."
          : "记录发货报告与费用分摊信息。"
      }
      moduleTabs={<LogisticsSubnav language={language} />}
    >
      <ShippingReportPanel entries={entries} language={language} />
    </AppShell>
  );
}
