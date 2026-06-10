import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LogisticsSubnav } from "@/components/logistics/logistics-subnav";
import { OrderFulfillmentsPanel } from "@/components/logistics/order-fulfillments-panel";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { buildFulfillmentGroups } from "@/lib/order-fulfillment-groups";
import {
  getForecastsByRegions,
  listContractsBySessionRegions,
  listFulfillmentShipments,
  listFulfillmentShipToOptions,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrderFulfillmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  const [forecasts, contracts, shipments, shipToOptions] = await Promise.all([
    getForecastsByRegions(session.regions),
    listContractsBySessionRegions(session.regions),
    listFulfillmentShipments(),
    listFulfillmentShipToOptions(),
  ]);
  const groups = buildFulfillmentGroups(forecasts, contracts);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Logistics Progress · Order fulfillments" : "物流进度 · 订单履约"}
      description={
        language === "en"
          ? "Track shipments for forecast lines with created contracts. Auto fields stay in sync with Cash flow analysis."
          : "跟踪已创建合同的 forecast 行的发运情况，自动字段与 Cash flow analysis 保持同步。"
      }
    >
      <div className="space-y-4">
        <LogisticsSubnav language={language} />
        <OrderFulfillmentsPanel
          language={language}
          groups={groups}
          shipments={shipments}
          shipToOptions={shipToOptions}
        />
      </div>
    </AppShell>
  );
}
