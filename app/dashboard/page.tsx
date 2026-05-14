import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CockpitVisualizations } from "@/components/dashboard/cockpit-visualizations";
import { AppShell } from "@/components/shared/app-shell";
import { signDashboardExportSnapshot } from "@/lib/dashboard-export-snapshot-token";
import { formatDataSnapshot } from "@/lib/format-data-snapshot";
import { normalizeLanguage } from "@/lib/i18n";
import {
  enrichForecastRecordsForCashFlow,
  getForecastsByRegions,
  listLogisticsShipmentsBySession,
  listOrderProgressBySessionRegions,
  listSuppliers,
  listUnitCostQuotes,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const [entries, orderProgressRows, logisticsRows, suppliers, unitCostQuotes] = await Promise.all([
    getForecastsByRegions(session.regions),
    listOrderProgressBySessionRegions(session.regions),
    listLogisticsShipmentsBySession(session),
    listSuppliers(),
    listUnitCostQuotes(),
  ]);
  const forecastCashFlowRows = await enrichForecastRecordsForCashFlow(entries);

  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const dataSnapshotAt = new Date().toISOString();
  const dataSnapshotDisplay = formatDataSnapshot(dataSnapshotAt, language);
  const dashboardExportSnapshotToken = signDashboardExportSnapshot({
    snapshotAt: dataSnapshotAt,
    username: session.username,
    regions: session.regions,
  });

  const t = {
    title: language === "en" ? "Dashboard" : "仪表盘",
    exportCsv: language === "en" ? "Export forecast CSV" : "导出 Forecast CSV",
    globalAsOfLead:
      language === "en" ? "Data snapshot for this page" : "本页数据截至",
    /** Full sentence for hover tooltip — kept off the main line to reduce noise. */
    globalAsOfTooltip:
      language === "en"
        ? "All sections on this page use the same server request snapshot. Filters only reshape this load; they do not fetch new data until you refresh."
        : "本页各区块均为本次请求的同一份快照。筛选项仅在本页已加载数据上变换视图，刷新页面后才会重新请求。",
  };

  const snapshotMeta = (
    <span title={t.globalAsOfTooltip}>
      <span className="font-medium text-[#6B7280]">{t.globalAsOfLead}</span>
      {": "}
      <span className="cursor-help tabular-nums border-b border-dotted border-[#9CA3AF] text-[#6B7280]">
        {dataSnapshotDisplay}
      </span>
    </span>
  );

  return (
    <AppShell session={session} title={t.title} headerMeta={snapshotMeta}>
      <CockpitVisualizations
        language={language}
        dataSnapshotAt={dataSnapshotAt}
        forecasts={entries}
        orderProgress={orderProgressRows}
        logistics={logisticsRows}
        forecastCashFlowRows={forecastCashFlowRows}
        fcSuppliers={suppliers}
        unitCostQuotes={unitCostQuotes}
        forecastExport={{
          href: "/api/dashboard/export-csv",
          label: t.exportCsv,
          snapshotToken: dashboardExportSnapshotToken,
        }}
      />
    </AppShell>
  );
}
