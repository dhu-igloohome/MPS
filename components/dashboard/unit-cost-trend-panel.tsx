"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { buildUnitCostTrend, trendableSkus } from "@/lib/dashboard-insights";
import type { Language } from "@/lib/i18n";
import type { UnitCostQuoteEntry } from "@/lib/types";

const LINE_COLORS = ["#ee6454", "#2563eb", "#059669", "#d97706", "#7c3aed", "#e11d48"];

export function UnitCostTrendPanel({ language, quotes }: { language: Language; quotes: UnitCostQuoteEntry[] }) {
  const en = language === "en";
  const skus = useMemo(() => trendableSkus(quotes), [quotes]);
  const [picked, setPicked] = useState<string>("");
  const sku = skus.some((s) => s.sku === picked) ? picked : (skus[0]?.sku ?? "");
  const trend = useMemo(() => (sku ? buildUnitCostTrend(quotes, sku) : null), [quotes, sku]);

  const title = en ? "Unit cost trend" : "单位成本走势";

  return (
    <section className="app-card overflow-hidden p-6 shadow-sm">
      <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-[#111827]">{title}</h2>
          <p className="mt-0.5 text-xs text-[#6B7280]">
            {en
              ? "Quoted unit price (USD, CNY quotes converted) by quote date, one line per supplier. Only SKUs with 2+ quotes."
              : "按报价日期看报价单价（USD，人民币报价已换算），每个供应商一条线。仅列出有 2 条以上报价的 SKU。"}
          </p>
        </div>
        {skus.length > 0 ? (
          <label className="flex shrink-0 items-center gap-2 text-sm text-[#374151]">
            <span className="text-xs font-medium text-[#6B7280]">SKU</span>
            <select
              className="app-control max-w-[14rem]"
              value={sku}
              onChange={(e) => setPicked(e.target.value)}
              aria-label="SKU"
            >
              {skus.map((s) => (
                <option key={s.sku} value={s.sku}>
                  {s.sku} ({s.quoteCount})
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {!trend || trend.rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#6B7280]">
          {en ? "No SKU has two or more quotes yet." : "暂无 SKU 有 2 条以上报价。"}
        </p>
      ) : (
        <div className="app-panel h-[280px] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend.rows} margin={{ left: 4, right: 16, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={["auto", "auto"]}
                tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
                width={56}
              />
              <Tooltip
                formatter={(value) => `$${Number(value ?? 0).toFixed(2)}`}
                contentStyle={{ borderRadius: "0.75rem", fontSize: "12px" }}
              />
              <Legend />
              {trend.suppliers.map((name, i) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
