import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ProductionManagementPanel } from "@/components/order-progress/production-management-panel";
import { OrderProgressSubnav } from "@/components/order-progress/order-progress-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ProductionManagementPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Production management" : "生产管理"}
      description={
        language === "en"
          ? "Part of Order Progress. This screen reserves layout space for production-related fields you will add later (owners, milestones, quantities, notes, etc.)."
          : "归属订单进度模块。本页预先划分版面，便于后续补充产量、节点、责任人、备注等生产相关字段。"
      }
      moduleTabs={<OrderProgressSubnav language={language} />}
    >
      <ProductionManagementPanel language={language} />
    </AppShell>
  );
}
