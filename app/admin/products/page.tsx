import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { ProductManagement } from "@/components/product/product-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listProducts } from "@/lib/repositories";
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

  const products = await listProducts();
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Product Database" : "产品数据库"}
      description={
        language === "en"
          ? "Manage product name, SKU, variant, unit cost, and article number."
          : "管理产品名称、SKU、型号、单价和 Article Number。"
      }
    >
      <ProductManagement products={products} language={language} />
    </AppShell>
  );
}
