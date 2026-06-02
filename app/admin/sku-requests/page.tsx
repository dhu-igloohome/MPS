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

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  let pending: Awaited<ReturnType<typeof listPendingSkuProductRequests>> = [];
  let loadError: string | null = null;
  try {
    pending = await listPendingSkuProductRequests();
  } catch (e) {
    loadError =
      e instanceof Error
        ? e.message
        : language === "en"
          ? "Could not load SKU requests."
          : "无法加载 SKU 申请列表。";
  }

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
      {loadError ? (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {loadError}
          {language === "en"
            ? " If this persists after deploy, ask ops to run database init or redeploy once."
            : " 若部署后仍出现，请联系运维执行数据库初始化或重新部署一次。"}
        </p>
      ) : null}
      <SkuProductRequestPanel language={language} initialPending={pending} />
    </AppShell>
  );
}
