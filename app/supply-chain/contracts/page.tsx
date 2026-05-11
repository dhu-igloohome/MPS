import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ContractManagement } from "@/components/contract/contract-management";
import { SupplyChainSubnav } from "@/components/supply-chain/supply-chain-subnav";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  listContractsBySessionRegions,
  listOrderContractCreateHints,
  listOrderProgressBySessionRegions,
  listSuppliers,
  listUnitCostQuotes,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SupplyChainContractsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const [contracts, orders, suppliers, unitCostQuotes] = await Promise.all([
    listContractsBySessionRegions(session.regions),
    listOrderProgressBySessionRegions(session.regions),
    listSuppliers(),
    listUnitCostQuotes(),
  ]);
  const orderContractHints = await listOrderContractCreateHints(orders, session.regions);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Supply Chain Management" : "供应链管理"}
      description={language === "en" ? "Suppliers, contracts and cost control in one module." : "将供应商、合同、成本控制整合到同一模块。"}
      moduleTabs={<SupplyChainSubnav language={language} />}
    >
      <ContractManagement
        contracts={contracts}
        orders={orders}
        orderContractHints={orderContractHints}
        suppliers={suppliers}
        unitCostQuotes={unitCostQuotes}
        language={language}
        role={session.role}
      />
    </AppShell>
  );
}

