import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { ForecastForm } from "@/components/forecast/forecast-form";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { getForecastsByRegions, listActiveProducts } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function ForecastPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const products = await listActiveProducts();
  const entries = await getForecastsByRegions(session.regions);
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Forecast Collection" : "Forecast 填报"}
      description={
        language === "en"
          ? "Module 1: collect monthly order forecast from APAC/EU/USA offices."
          : "模块 1：收集 APAC/EU/USA 办公室月度订单 forecast。"
      }
    >
      <ForecastForm
        allowedRegions={session.regions}
        products={products}
        entries={entries}
        language={language}
        canDelete={session.role === "regional_admin" || session.role === "super_admin"}
      />
    </AppShell>
  );
}
