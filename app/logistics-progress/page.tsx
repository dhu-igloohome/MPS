import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LogisticsProgressPanel } from "@/components/logistics/logistics-progress-panel";
import { LogisticsSubnav } from "@/components/logistics/logistics-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  getForecastsByRegions,
  listActiveProducts,
  listLogisticsShipmentsBySession,
  listOrderProgressBySessionRegions,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LogisticsProgressPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  const [products, entries, orderLines, forecasts] = await Promise.all([
    listActiveProducts(),
    listLogisticsShipmentsBySession(session),
    listOrderProgressBySessionRegions(session.regions),
    getForecastsByRegions(session.regions),
  ]);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Logistics Progress" : "物流进度"}
      description={
        language === "en"
          ? "Record inbound and inter-office transfers (no inventory deduction). Visibility follows your regions on from/to endpoints."
          : "记录外部入库与办公室间调拨（不扣库存）。可见范围按物流起点/终点与您负责区域匹配。"
      }
      moduleTabs={<LogisticsSubnav language={language} />}
    >
      <LogisticsProgressPanel
        entries={entries}
        products={products}
        orderLines={orderLines}
        forecasts={forecasts}
        language={language}
      />
    </AppShell>
  );
}
