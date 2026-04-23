import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LogisticsSubnav } from "@/components/logistics/logistics-subnav";
import { OrderFulfillmentsPanel } from "@/components/logistics/order-fulfillments-panel";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrderFulfillmentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Logistics Progress · Order fulfillments" : "物流进度 · 订单履约"}
      description={
        language === "en"
          ? "Track how customer orders are fulfilled (placeholders for fields you will add). Same logistics module tabs as other sub-pages."
          : "用于跟踪订单履约情况（当前为占位字段，可按业务补充）。与本模块其它子页共用顶部子导航。"
      }
    >
      <div className="space-y-4">
        <LogisticsSubnav language={language} />
        <OrderFulfillmentsPanel language={language} />
      </div>
    </AppShell>
  );
}
