import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { InventoryGlobalPanel } from "@/components/logistics/inventory-global-panel";
import { LogisticsSubnav } from "@/components/logistics/logistics-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listInventoryGlobalEntries } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function InventoryGlobalPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const entries = await listInventoryGlobalEntries();
  return (
    <AppShell
      session={session}
      title={language === "en" ? "Logistics Progress · Inventory Global" : "物流进度 · Inventory Global"}
      description={
        language === "en"
          ? "Global inventory by Main SKU, locations, and cost fields."
          : "按 Main SKU、各仓位置与成本字段维护全球库存。"
      }
    >
      <div className="space-y-4">
        <LogisticsSubnav language={language} />
        <InventoryGlobalPanel entries={entries} language={language} />
      </div>
    </AppShell>
  );
}
