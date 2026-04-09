import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OrderProgressPanel } from "@/components/order-progress/order-progress-panel";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  getForecastsByRegions,
  listActiveProducts,
  listMassProductionKanbanBySessionRegions,
  listOrderProgressDeletionLogsBySessionRegions,
  listOrderProgressBySessionRegions,
  massProductionKanbanRegionsForSession,
  orderProgressRegionsForSession,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrderProgressPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  const products = await listActiveProducts();
  const massProductionKanban = await listMassProductionKanbanBySessionRegions(session.regions);
  const entries = await listOrderProgressBySessionRegions(session.regions);
  const deletionLogs = await listOrderProgressDeletionLogsBySessionRegions(session.regions, 100);
  const forecasts = await getForecastsByRegions(session.regions);
  const allowedRegions = orderProgressRegionsForSession(session.regions);
  const massProductionKanbanAllowedRegions = massProductionKanbanRegionsForSession(session.regions);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Order Progress" : "订单进度"}
      description={
        language === "en"
          ? "Track order lines by region (independent from Forecast). Includes Mass production Kanban (SKU, quantity, MP, milestone dates). Delivery dates use calendar days (Singapore business context)."
          : "按区域维护订单行（与 Forecast 独立）。页面顶部为量产看板（Mass production Kanban），可维护 SKU、数量、MP 与各节点日期。交货日期按日历日存储（业务语境为新加坡）。"
      }
    >
      <OrderProgressPanel
        entries={entries}
        forecasts={forecasts}
        deletionLogs={deletionLogs}
        massProductionKanbanEntries={massProductionKanban}
        products={products}
        allowedRegions={allowedRegions}
        massProductionKanbanAllowedRegions={massProductionKanbanAllowedRegions}
        language={language}
      />
    </AppShell>
  );
}
