import { redirect } from "next/navigation";

import { ProductManagement } from "@/components/product/product-management";
import { AppShell } from "@/components/shared/app-shell";
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

  return (
    <AppShell
      session={session}
      title="Product Database"
      description="Manage product name, SKU, variant, unit cost, and article number."
    >
      <ProductManagement products={products} />
    </AppShell>
  );
}
