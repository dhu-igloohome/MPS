import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import {
  getForecastsByRegions,
  getSummaryByMonthAndRegion,
  getSummaryByQuarterAndRegion,
} from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const entries = await getForecastsByRegions(session.regions);
  const summary = await getSummaryByMonthAndRegion(session.regions);
  const quarterSummary = await getSummaryByQuarterAndRegion(session.regions);
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
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
    by: language === "en" ? "By" : "提交人",
    noRecords: language === "en" ? "No records yet." : "暂无记录。",
  };

  const totalBTO = entries.reduce((sum, item) => sum + item.buildToOrder, 0);
  const totalBTS = entries.reduce((sum, item) => sum + item.buildToStock, 0);
  const totalForecast = totalBTO + totalBTS;

  return (
    <AppShell
      session={session}
      title={t.title}
      description={t.description}
    >
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">{t.totalForecast}</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatNumber(totalForecast)}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">{t.bto}</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatNumber(totalBTO)}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">{t.bts}</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatNumber(totalBTS)}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">{t.monthlyTitle}</h3>
          <div className="flex items-center gap-3">
            <a
              href="/api/dashboard/export-csv"
              className="inline-flex items-center rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
            >
              {t.exportCsv}
            </a>
            <Link href="/forecast" className="text-sm text-indigo-600 hover:text-indigo-500">
              {t.addForecast}
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
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
                  <td colSpan={5} className="px-2 py-6 text-center text-zinc-500">
                    {t.noMonthlyData}
                  </td>
                </tr>
              ) : (
                summary.map((item) => (
                  <tr key={`${item.month}-${item.region}`} className="border-b border-zinc-100">
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

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-zinc-900">{t.quarterTitle}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
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
                  <td colSpan={6} className="px-2 py-6 text-center text-zinc-500">
                    {t.noQuarterlyData}
                  </td>
                </tr>
              ) : (
                quarterSummary.map((item) => (
                  <tr key={`${item.quarter}-${item.region}`} className="border-b border-zinc-100">
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

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-zinc-900">{t.latestTitle}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
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
                  <td colSpan={8} className="px-2 py-6 text-center text-zinc-500">
                    {t.noRecords}
                  </td>
                </tr>
              ) : (
                entries.slice(0, 20).map((item) => (
                  <tr key={item.id} className="border-b border-zinc-100">
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
