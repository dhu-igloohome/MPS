import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SupplyChainSubnav } from "@/components/supply-chain/supply-chain-subnav";
import { SupplierManagement } from "@/components/supplier/supplier-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listSuppliers } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SupplyChainSuppliersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const suppliers = await listSuppliers();

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Supply Chain Management" : "供应链管理"}
      description={language === "en" ? "Suppliers, contracts and cost control in one module." : "将供应商、合同、成本控制整合到同一模块。"}
      moduleTabs={<SupplyChainSubnav language={language} />}
    >
      <SupplierManagement suppliers={suppliers} language={language} />
    </AppShell>
  );
}

