"use client";

import { useMemo } from "react";

import { buildSupplierConcentration } from "@/lib/dashboard-insights";
import type { Language } from "@/lib/i18n";
import type { ContractEntry } from "@/lib/types";

function formatNum(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export function SupplierConcentrationPanel({ language, contracts }: { language: Language; contracts: ContractEntry[] }) {
  const en = language === "en";
  const { rows, total } = useMemo(
    () => buildSupplierConcentration(contracts, 8, en ? "Other suppliers" : "其他供应商"),
    [contracts, en],
  );
  const top = rows[0];

  return (
    <section className="app-card overflow-hidden p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight text-[#111827]">
          {en ? "Supplier concentration" : "供应商集中度"}
        </h2>
        <p className="mt-0.5 text-xs text-[#6B7280]">
          {en
            ? "Share of contracted quantity per supplier (approved/sent contracts, all months). Quantity only, no amounts."
            : "各供应商占合同数量的比例（已批准/已发出的合同，不分月份）。只看数量，不含金额。"}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#9CA3AF]">{en ? "No contracts yet." : "暂无合同。"}</p>
      ) : (
        <div className="app-panel space-y-3 p-4">
          {rows.map((r) => (
            <div key={r.name} className="min-w-0">
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate font-medium text-[#374151]" title={r.name}>
                  {r.name}
                </span>
                <span className="shrink-0 tabular-nums text-[#111827]">
                  {formatNum(r.quantity)}
                  <span className="ml-2 text-xs text-[#6B7280]">
                    {r.pct.toFixed(r.pct < 10 ? 1 : 0)}% · {r.contracts} {en ? (r.contracts === 1 ? "contract" : "contracts") : "份"}
                  </span>
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[#F3F4F6]">
                <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${Math.min(100, r.pct)}%` }} />
              </div>
            </div>
          ))}
          {top ? (
            <p className="pt-1 text-[11px] text-[#6B7280]">
              {en
                ? `Total ${formatNum(total)} units. Largest supplier: ${top.name} (${top.pct.toFixed(0)}%).`
                : `合计 ${formatNum(total)} 台。最大供应商：${top.name}（${top.pct.toFixed(0)}%）。`}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
