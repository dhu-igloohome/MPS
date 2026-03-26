import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SupplierManagement } from "@/components/supplier/supplier-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listSuppliers } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const suppliers = await listSuppliers();

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Supplier Management" : "供应商管理"}
      description={
        language === "en"
          ? "Maintain supplier records for contract generation."
          : "维护供应商信息，供合同模块调用生成附件。"
      }
    >
      <SupplierManagement suppliers={suppliers} language={language} />
    </AppShell>
  );
}

