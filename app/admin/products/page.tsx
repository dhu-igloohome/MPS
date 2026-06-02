import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { SkuProductRequestPanel } from "@/components/admin/sku-product-request-panel";
import { ProductManagement } from "@/components/product/product-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listProducts } from "@/lib/repositories";
import { listPendingSkuProductRequests } from "@/lib/sku-product-request-repository";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  if (session.role !== "super_admin") {
    redirect("/dashboard");
  }

  const [products, pendingSkuRequests] = await Promise.all([
    listProducts(),
    listPendingSkuProductRequests().catch(() => []),
  ]);
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "NPI Management · Product Database" : "NPI 管理 · 产品数据库"}
      description={
        language === "en"
          ? "Manage product name, SKU, variant, unit cost, and article number."
          : "管理产品名称、SKU、型号、单价和 Article Number。"
      }
    >
      {pendingSkuRequests.length > 0 ? (
        <section className="mb-8 rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
          <SkuProductRequestPanel language={language} initialPending={pendingSkuRequests} />
        </section>
      ) : null}
      <ProductManagement products={products} language={language} />
    </AppShell>
  );
}
