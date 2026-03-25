import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { OrderProgressPanel } from "@/components/order-progress/order-progress-panel";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  listActiveProducts,
  listOrderProgressBySessionRegions,
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
  const entries = await listOrderProgressBySessionRegions(session.regions);
  const allowedRegions = orderProgressRegionsForSession(session.regions);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Order Progress" : "订单进度"}
      description={
        language === "en"
          ? "Track order lines by region (independent from Forecast). Delivery dates are stored as calendar days (Singapore business context)."
          : "按区域维护订单行（与 Forecast 独立）。交货日期按日历日存储（业务语境为新加坡）。"
      }
    >
      <OrderProgressPanel
        entries={entries}
        products={products}
        allowedRegions={allowedRegions}
        language={language}
      />
    </AppShell>
  );
}
