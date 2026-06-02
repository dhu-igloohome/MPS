import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { SkuProductRequestPanel } from "@/components/admin/sku-product-request-panel";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listPendingSkuProductRequests } from "@/lib/sku-product-request-repository";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminSkuRequestsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "super_admin") redirect("/dashboard");

  const pending = await listPendingSkuProductRequests();
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "NPI · SKU requests" : "NPI · SKU 申请审批"}
      description={
        language === "en"
          ? "Review Forecast SKU requests before they are added to the product database."
          : "审批 Forecast 提交的新 SKU，通过后写入产品数据库。"
      }
    >
      <SkuProductRequestPanel language={language} initialPending={pending} />
    </AppShell>
  );
}
