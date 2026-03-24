import { redirect } from "next/navigation";

import { ForecastForm } from "@/components/forecast/forecast-form";
import { AppShell } from "@/components/shared/app-shell";
import { OFFICES_BY_REGION } from "@/lib/accounts";
import { listActiveProducts } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const products = await listActiveProducts();

  return (
    <AppShell
      session={session}
      title="Forecast Collection"
      description="Module 1: collect monthly order forecast from APAC/EU/USA offices."
    >
      <ForecastForm
        allowedRegions={session.regions}
        officesByRegion={OFFICES_BY_REGION}
        products={products}
      />
    </AppShell>
  );
}
