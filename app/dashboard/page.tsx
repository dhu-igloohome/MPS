import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  getForecastsByRegions,
  listLogisticsShipmentsBySession,
  listOrderProgressBySessionRegions,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";
import type { ForecastEntry, Region } from "@/lib/types";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function quarterFromMonth(month: string) {
  const m = Number(month.split("-")[1] || "1");
  return `Q${Math.floor((Math.max(1, Math.min(12, m)) - 1) / 3) + 1}`;
}

function buildMonthlySummary(entries: ForecastEntry[]) {
  const map = new Map<string, { month: string; region: Region; buildToOrder: number; buildToStock: number }>();
  for (const e of entries) {
    const key = `${e.month}::${e.region}`;
    const curr = map.get(key) ?? { month: e.month, region: e.region, buildToOrder: 0, buildToStock: 0 };
    curr.buildToOrder += e.buildToOrder;
    curr.buildToStock += e.buildToStock;
    map.set(key, curr);
  }
  return Array.from(map.values()).sort((a, b) =>
    a.month === b.month ? a.region.localeCompare(b.region) : b.month.localeCompare(a.month),
  );
}

function buildQuarterSummary(entries: ForecastEntry[]) {
  const map = new Map<
    string,
    { quarter: string; region: Region; buildToOrder: number; buildToStock: number; skuSet: Set<string> }
  >();
  for (const e of entries) {
    const quarter = `${e.month.slice(0, 4)}-${quarterFromMonth(e.month)}`;
    const key = `${quarter}::${e.region}`;
    const curr = map.get(key) ?? {
      quarter,
      region: e.region,
      buildToOrder: 0,
      buildToStock: 0,
      skuSet: new Set<string>(),
    };
    curr.buildToOrder += e.buildToOrder;
    curr.buildToStock += e.buildToStock;
    curr.skuSet.add(e.sku);
    map.set(key, curr);
  }
  return Array.from(map.values())
    .map((x) => ({
      quarter: x.quarter,
      region: x.region,
      buildToOrder: x.buildToOrder,
      buildToStock: x.buildToStock,
      skuCount: x.skuSet.size,
    }))
    .sort((a, b) =>
      a.quarter === b.quarter ? a.region.localeCompare(b.region) : b.quarter.localeCompare(a.quarter),
    );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const params = (await searchParams) ?? {};
  const entries = await getForecastsByRegions(session.regions);
  const orderProgressRows = await listOrderProgressBySessionRegions(session.regions);
  const logisticsRows = await listLogisticsShipmentsBySession(session);
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const filterMonth = String(params.month ?? "").trim();
  const filterRegion = String(params.region ?? "").trim();
  const filterOffice = String(params.office ?? "").trim();
  const filterProduct = String(params.productName ?? "").trim();
  const monthOptions = [...new Set(entries.map((e) => e.month))].sort((a, b) => b.localeCompare(a));
  const regionOptions = [...new Set(entries.map((e) => e.region))].sort();
  const officeOptions = [...new Set(entries.map((e) => e.office).filter(Boolean))].sort();
  const productOptions = [...new Set(entries.map((e) => e.productName))].sort();
  const filteredEntries = entries.filter((e) => {
    if (filterMonth && e.month !== filterMonth) return false;
    if (filterRegion && e.region !== filterRegion) return false;
    if (filterOffice && e.office !== filterOffice) return false;
    if (filterProduct && e.productName !== filterProduct) return false;
    return true;
  });
  const summary = buildMonthlySummary(filteredEntries);
  const quarterSummary = buildQuarterSummary(filteredEntries);
  const t = {
    title: language === "en" ? "Cockpit" : "驾驶舱",
    description:
      language === "en"
        ? "Main view for monthly forecast totals by region and latest submitted records."
        : "按区域查看月度汇总、季度汇总与最新提交记录。",
    totalForecast: language === "en" ? "Total Forecast" : "总 Forecast",
    bto: language === "en" ? "Build to Order" : "按单生产",
    bts: language === "en" ? "Build to Stock" : "备货生产",
    monthlyTitle: language === "en" ? "Monthly Summary by Region" : "按区域月度汇总",
    exportCsv: language === "en" ? "Export CSV" : "导出 CSV",
    addForecast: language === "en" ? "Add forecast" : "新增 forecast",
    month: language === "en" ? "Month" : "月份",
    region: language === "en" ? "Region" : "区域",
    total: language === "en" ? "Total" : "合计",
    noMonthlyData: language === "en" ? "No forecast data yet." : "暂无 forecast 数据。",
    quarterTitle:
      language === "en" ? "Quarterly Summary by Region (with SKU)" : "按区域季度汇总（含 SKU）",
    quarter: language === "en" ? "Quarter" : "季度",
    forecastTotal: language === "en" ? "Forecast Total" : "Forecast 合计",
    skuCount: language === "en" ? "SKU Count" : "SKU 数量",
    noQuarterlyData:
      language === "en" ? "No quarterly forecast data yet." : "暂无季度 forecast 数据。",
    latestTitle: language === "en" ? "Latest Forecast Entries" : "最新 Forecast 记录",
    office: language === "en" ? "Office" : "办公室",
    productName: language === "en" ? "Product Name" : "产品名称",
    filters: language === "en" ? "Filters" : "筛选",
    clear: language === "en" ? "Clear" : "清空",
    by: language === "en" ? "By" : "提交人",
    noRecords: language === "en" ? "No records yet." : "暂无记录。",
    orderLogisticsTitle: language === "en" ? "Order & logistics snapshot" : "订单与物流概览",
    orderProgressModule: language === "en" ? "Order progress" : "订单进度",
    logisticsModule: language === "en" ? "Logistics progress" : "物流进度",
    recordCountLabel: language === "en" ? "visible records" : "可见记录数",
    openModule: language === "en" ? "Open" : "进入",
    exportOrderCsv: language === "en" ? "Export orders CSV" : "导出订单 CSV",
    exportLogisticsCsv: language === "en" ? "Export logistics CSV" : "导出物流 CSV",
  };

  const totalBTO = filteredEntries.reduce((sum, item) => sum + item.buildToOrder, 0);
  const totalBTS = filteredEntries.reduce((sum, item) => sum + item.buildToStock, 0);
  const totalForecast = totalBTO + totalBTS;

  return (
    <AppShell
      session={session}
      title={t.title}
      description={t.description}
    >
      <section className="rounded-2xl border border-app-border/90 bg-app-surface shadow-sm p-5">
        <h3 className="mb-3 text-lg font-semibold text-foreground">{t.filters}</h3>
        <form className="grid gap-3 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm text-app-muted">{t.month}</span>
            <select
              name="month"
              defaultValue={filterMonth}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            >
              <option value="">All</option>
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-app-muted">{t.region}</span>
            <select
              name="region"
              defaultValue={filterRegion}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            >
              <option value="">All</option>
              {regionOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-app-muted">{t.office}</span>
            <select
              name="office"
              defaultValue={filterOffice}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            >
              <option value="">All</option>
              {officeOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-app-muted">{t.productName}</span>
            <select
              name="productName"
              defaultValue={filterProduct}
              className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
            >
              <option value="">All</option>
              {productOptions.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <div className="md:col-span-4 flex items-center gap-2">
            <button
              type="submit"
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover"
            >
              {t.filters}
            </button>
            <Link
              href="/dashboard"
              className="rounded-lg border border-app-border px-4 py-2 text-sm text-foreground/85 hover:bg-app-accent-soft"
            >
              {t.clear}
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-app-border/90 bg-app-surface shadow-sm p-5">
          <p className="text-sm text-app-muted">{t.totalForecast}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(totalForecast)}</p>
        </article>
        <article className="rounded-2xl border border-app-border/90 bg-app-surface shadow-sm p-5">
          <p className="text-sm text-app-muted">{t.bto}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(totalBTO)}</p>
        </article>
        <article className="rounded-2xl border border-app-border/90 bg-app-surface shadow-sm p-5">
          <p className="text-sm text-app-muted">{t.bts}</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(totalBTS)}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-app-border/90 bg-app-surface shadow-sm p-5">
        <h3 className="mb-4 text-lg font-semibold text-foreground">{t.orderLogisticsTitle}</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <article className="rounded-xl border border-app-border/50 bg-app-accent-soft/40 p-4">
            <p className="text-sm font-medium text-foreground/85">{t.orderProgressModule}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {orderProgressRows.length}
            </p>
            <p className="text-xs text-app-muted">{t.recordCountLabel}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/order-progress"
                className="inline-flex rounded-lg bg-app-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-app-accent-hover"
              >
                {t.openModule}
              </Link>
              <Link
                href="/api/order-progress/export-csv"
                prefetch={false}
                className="inline-flex rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-foreground/85 hover:border-app-accent/35 hover:bg-app-accent-soft"
              >
                {t.exportOrderCsv}
              </Link>
            </div>
          </article>
          <article className="rounded-xl border border-app-border/50 bg-app-accent-soft/40 p-4">
            <p className="text-sm font-medium text-foreground/85">{t.logisticsModule}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
              {logisticsRows.length}
            </p>
            <p className="text-xs text-app-muted">{t.recordCountLabel}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/logistics-progress"
                className="inline-flex rounded-lg bg-app-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-app-accent-hover"
              >
                {t.openModule}
              </Link>
              <Link
                href="/api/logistics-shipments/export-csv"
                prefetch={false}
                className="inline-flex rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-foreground/85 hover:border-app-accent/35 hover:bg-app-accent-soft"
              >
                {t.exportLogisticsCsv}
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="rounded-2xl border border-app-border/90 bg-app-surface shadow-sm p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">{t.monthlyTitle}</h3>
          <div className="flex items-center gap-3">
            <a
              href="/api/dashboard/export-csv"
              className="inline-flex items-center rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-foreground/85 hover:border-app-accent/35 hover:bg-app-accent-soft hover:text-foreground"
            >
              {t.exportCsv}
            </a>
            <Link href="/forecast" className="text-sm font-medium text-app-accent hover:text-app-accent-hover">
              {t.addForecast}
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left text-app-muted">
                <th className="px-2 py-2">{t.month}</th>
                <th className="px-2 py-2">{t.region}</th>
                <th className="px-2 py-2">{t.bto}</th>
                <th className="px-2 py-2">{t.bts}</th>
                <th className="px-2 py-2">{t.total}</th>
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-app-muted">
                    {t.noMonthlyData}
                  </td>
                </tr>
              ) : (
                summary.map((item) => (
                  <tr key={`${item.month}-${item.region}`} className="border-b border-app-border/40">
                    <td className="px-2 py-2">{item.month}</td>
                    <td className="px-2 py-2">{item.region}</td>
                    <td className="px-2 py-2">{formatNumber(item.buildToOrder)}</td>
                    <td className="px-2 py-2">{formatNumber(item.buildToStock)}</td>
                    <td className="px-2 py-2">
                      {formatNumber(item.buildToOrder + item.buildToStock)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-app-border/90 bg-app-surface shadow-sm p-5">
        <h3 className="text-lg font-semibold text-foreground">{t.quarterTitle}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left text-app-muted">
                <th className="px-2 py-2">{t.quarter}</th>
                <th className="px-2 py-2">{t.region}</th>
                <th className="px-2 py-2">{t.bto}</th>
                <th className="px-2 py-2">{t.bts}</th>
                <th className="px-2 py-2">{t.forecastTotal}</th>
                <th className="px-2 py-2">{t.skuCount}</th>
              </tr>
            </thead>
            <tbody>
              {quarterSummary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-app-muted">
                    {t.noQuarterlyData}
                  </td>
                </tr>
              ) : (
                quarterSummary.map((item) => (
                  <tr key={`${item.quarter}-${item.region}`} className="border-b border-app-border/40">
                    <td className="px-2 py-2">{item.quarter}</td>
                    <td className="px-2 py-2">{item.region}</td>
                    <td className="px-2 py-2">{formatNumber(item.buildToOrder)}</td>
                    <td className="px-2 py-2">{formatNumber(item.buildToStock)}</td>
                    <td className="px-2 py-2">
                      {formatNumber(item.buildToOrder + item.buildToStock)}
                    </td>
                    <td className="px-2 py-2">{formatNumber(item.skuCount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-app-border/90 bg-app-surface shadow-sm p-5">
        <h3 className="text-lg font-semibold text-foreground">{t.latestTitle}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-app-border text-left text-app-muted">
                <th className="px-2 py-2">{t.month}</th>
                <th className="px-2 py-2">{t.region}</th>
                <th className="px-2 py-2">{t.office}</th>
                <th className="px-2 py-2">{t.productName}</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">BTO</th>
                <th className="px-2 py-2">BTS</th>
                <th className="px-2 py-2">{t.by}</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-app-muted">
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                filteredEntries.slice(0, 200).map((item) => (
                  <tr key={item.id} className="border-b border-app-border/40">
                    <td className="px-2 py-2">{item.month}</td>
                    <td className="px-2 py-2">{item.region}</td>
                    <td className="px-2 py-2">{item.office}</td>
                    <td className="px-2 py-2">{item.productName}</td>
                    <td className="px-2 py-2">{item.sku}</td>
                    <td className="px-2 py-2">{formatNumber(item.buildToOrder)}</td>
                    <td className="px-2 py-2">{formatNumber(item.buildToStock)}</td>
                    <td className="px-2 py-2">{item.createdBy}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}
