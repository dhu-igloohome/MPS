import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ContractManagement } from "@/components/contract/contract-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  listContractsBySessionRegions,
  listOrderProgressBySessionRegions,
  listSuppliers,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const [contracts, orders, suppliers] = await Promise.all([
    listContractsBySessionRegions(session.regions),
    listOrderProgressBySessionRegions(session.regions),
    listSuppliers(),
  ]);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Contract Management" : "Contract Management"}
      description={
        language === "en"
          ? "Create contract attachments by calling order data."
          : "Create contract attachments by calling order data."
      }
    >
      <ContractManagement
        contracts={contracts}
        orders={orders}
        suppliers={suppliers}
        language={language}
        role={session.role}
      />
    </AppShell>
  );
}
