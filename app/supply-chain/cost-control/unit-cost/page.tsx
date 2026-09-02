import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { UnitCostPanel } from "@/components/supply-chain/cost-control/unit-cost-panel";
import { SupplyChainSubnav } from "@/components/supply-chain/supply-chain-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listActiveProducts, listSuppliers, listUnitCostQuotes } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function UnitCostPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const [entries, products, suppliers] = await Promise.all([
    listUnitCostQuotes(),
    listActiveProducts(),
    listSuppliers(),
  ]);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Supply Chain Management" : "供应链管理"}
      description={
        language === "en"
          ? "Unit cost quotations: SKU, price, tax flag, supplier, quote date — full history below."
          : "单位成本报价：SKU、单价、是否含税、供应商、报价日期；下方保留完整历史记录。"
      }
      moduleTabs={<SupplyChainSubnav language={language} />}
    >
      <div className="mt-4 space-y-3">
        <section className="rounded-2xl border border-app-border/90 bg-app-surface p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-semibold text-foreground">
            {language === "en" ? "Unit cost" : "单位成本"}
          </h2>
          <UnitCostPanel
            language={language}
            initialEntries={entries}
            products={products}
            suppliers={suppliers}
          />
        </section>
      </div>
    </AppShell>
  );
}
