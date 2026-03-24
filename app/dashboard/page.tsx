import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
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

  const totalBTO = entries.reduce((sum, item) => sum + item.buildToOrder, 0);
  const totalBTS = entries.reduce((sum, item) => sum + item.buildToStock, 0);
  const totalForecast = totalBTO + totalBTS;

  return (
    <AppShell
      session={session}
      title="Cockpit"
      description="Main view for monthly forecast totals by region and latest submitted records."
    >
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Total Forecast</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatNumber(totalForecast)}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Build to Order</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatNumber(totalBTO)}</p>
        </article>
        <article className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-sm text-zinc-500">Build to Stock</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-900">{formatNumber(totalBTS)}</p>
        </article>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">Monthly Summary by Region</h3>
          <Link href="/forecast" className="text-sm text-indigo-600 hover:text-indigo-500">
            Add forecast
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-2 py-2">Month</th>
                <th className="px-2 py-2">Region</th>
                <th className="px-2 py-2">Build to Order</th>
                <th className="px-2 py-2">Build to Stock</th>
                <th className="px-2 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {summary.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-zinc-500">
                    No forecast data yet.
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
        <h3 className="text-lg font-semibold text-zinc-900">Quarterly Summary by Region (with SKU)</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-2 py-2">Quarter</th>
                <th className="px-2 py-2">Region</th>
                <th className="px-2 py-2">Build to Order</th>
                <th className="px-2 py-2">Build to Stock</th>
                <th className="px-2 py-2">Forecast Total</th>
                <th className="px-2 py-2">SKU Count</th>
              </tr>
            </thead>
            <tbody>
              {quarterSummary.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-zinc-500">
                    No quarterly forecast data yet.
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
        <h3 className="text-lg font-semibold text-zinc-900">Latest Forecast Entries</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-2 py-2">Month</th>
                <th className="px-2 py-2">Region</th>
                <th className="px-2 py-2">Office</th>
                <th className="px-2 py-2">Product Name</th>
                <th className="px-2 py-2">SKU</th>
                <th className="px-2 py-2">BTO</th>
                <th className="px-2 py-2">BTS</th>
                <th className="px-2 py-2">By</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-center text-zinc-500">
                    No records yet.
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
