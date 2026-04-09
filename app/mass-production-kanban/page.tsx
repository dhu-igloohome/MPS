import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { MassProductionKanbanSection } from "@/components/order-progress/mass-production-kanban-section";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  listActiveProducts,
  listMassProductionKanbanBySessionRegions,
  massProductionKanbanRegionsForSession,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function MassProductionKanbanPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  const products = await listActiveProducts();
  const entries = await listMassProductionKanbanBySessionRegions(session.regions);
  const allowedRegions = massProductionKanbanRegionsForSession(session.regions);

  const noRegionMessage =
    language === "en"
      ? "Your account has no region assignment. You cannot manage the mass production Kanban."
      : "您的账号未分配区域，无法使用量产看板。";

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Mass production Kanban" : "量产看板"}
      description={
        language === "en"
          ? "SKU-level mass production tracking: quantity, MP, milestone dates (EE, ME, SMT, Assembly, ORT, etc.) by region. Calendar days (Singapore business context)."
          : "按区域维护量产看板：SKU、数量、MP 与各节点日期（EE、ME、SMT、Assembly、ORT 等）。日期按日历日（业务语境为新加坡）。"
      }
    >
      {allowedRegions.length === 0 ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {noRegionMessage}
        </p>
      ) : (
        <MassProductionKanbanSection
          entries={entries}
          products={products}
          allowedRegions={allowedRegions}
          language={language}
        />
      )}
    </AppShell>
  );
}
