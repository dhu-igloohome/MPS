import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { PaymentScheduleReports } from "@/components/supply-chain/cost-control/payment-schedule-reports";
import { SupplyChainSubnav } from "@/components/supply-chain/supply-chain-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { enrichForecastRecordsForCashFlow, getForecastsByRegions, listSuppliers } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function PaymentSchedulePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const [forecastRecords, suppliers] = await Promise.all([
    getForecastsByRegions(session.regions),
    listSuppliers(),
  ]);
  const forecastCashFlowRows = await enrichForecastRecordsForCashFlow(forecastRecords);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Supply Chain Management" : "供应链管理"}
      description={
        language === "en"
          ? "Deposit and balance payment schedule by SKU and supplier."
          : "按 SKU 与供应商查看订金、尾款应付计划。"
      }
      moduleTabs={<SupplyChainSubnav language={language} />}
    >
      <PaymentScheduleReports
        language={language}
        rows={forecastCashFlowRows}
        suppliers={suppliers}
      />
    </AppShell>
  );
}
