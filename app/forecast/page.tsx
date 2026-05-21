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
  const [products, entries, cookieStore] = await Promise.all([
    listActiveProducts(),
    getForecastsByRegions(session.regions),
    cookies(),
  ]);
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Forecast" : "Forecast 填报"}
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
