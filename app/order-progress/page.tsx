import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OrderProgressPanel } from "@/components/order-progress/order-progress-panel";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  getForecastsByRegions,
  listActiveProducts,
  listOrderProgressDeletionLogsBySessionRegions,
  listOrderProgressBySessionRegions,
  listSuppliers,
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

  const [products, suppliers, entries, deletionLogs, forecasts] = await Promise.all([
    listActiveProducts(),
    listSuppliers(),
    listOrderProgressBySessionRegions(session.regions),
    listOrderProgressDeletionLogsBySessionRegions(session.regions, 100),
    getForecastsByRegions(session.regions),
  ]);
  const allowedRegions = orderProgressRegionsForSession(session.regions);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Order Progress" : "订单进度"}
      description={
        language === "en"
          ? "Track order lines by region (independent from Forecast). Mass production Kanban and Production management live under Order Progress in the sidebar (hover the menu). Delivery dates use calendar days (Singapore business context)."
          : "按区域维护订单行（与 Forecast 独立）。量产看板与生产管理请从侧栏「订单进度」悬停子菜单进入。交货日期按日历日存储（业务语境为新加坡）。"
      }
    >
      <OrderProgressPanel
        entries={entries}
        forecasts={forecasts}
        deletionLogs={deletionLogs}
        products={products}
        suppliers={suppliers}
        allowedRegions={allowedRegions}
        language={language}
      />
    </AppShell>
  );
}
