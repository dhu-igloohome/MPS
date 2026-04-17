"use client";

import { useMemo, useState } from "react";

import { formatUsd } from "@/lib/format-usd";
import type { Language } from "@/lib/i18n";
import { computeLandedCostPerUnitUsd } from "@/lib/landed-cost-cash-flow";
import type { ForecastCashFlowRow } from "@/lib/types";

type Props = {
  language: Language;
  rows: ForecastCashFlowRow[];
};

function poKey(row: ForecastCashFlowRow): string {
  return row.poNumber.trim();
}

function lineLandedTotalUsd(row: ForecastCashFlowRow): number | null {
  const q = row.latestUnitCostQuote;
  const landed = computeLandedCostPerUnitUsd({
    forecastIncoterm: row.incoterm,
    shippingMode: row.cashFlowShippingMode,
    unitPriceUsd: row.unitPriceUsd,
    destinationTariffPct: q?.destinationTariffPct ?? null,
    seaFreightUsd: q?.seaFreightUnitPrice ?? null,
    airFreightUsd: q?.airFreightUnitPrice ?? null,
  });
  const qty = Number(row.buildToOrder) + Number(row.buildToStock);
  if (landed == null || !Number.isFinite(qty) || qty <= 0) return null;
  return landed * qty;
}

export function LandedCostConsolidatePanel({ language, rows }: Props) {
  const en = language === "en";
  const t = {
    title: en ? "Landed cost consolidate" : "到岸成本汇总",
    hint: en
      ? "Uses the same rules as Cost Control → Cash flow (Forecast PO lines with remark OK, FOB/DAP/DDP, tariff + freight by shipping mode). Totals are Σ (landed USD/unit × quantity) per PO."
      : "与「成本控制 → 现金流」一致：Forecast 行 remark 为 OK、贸易条款 FOB/DAP/DDP，按海运/空运与关税+运费计算到岸单价；此处按 PO 汇总 Σ（到岸单价 USD × 数量）。",
    poOrder: en ? "PO order" : "PO 订单",
    selectPo: en ? "Select PO order…" : "选择 PO…",
    emptyPo: en ? "(no PO on file)" : "（无 PO）",
    landedCost: en ? "Landed cost" : "到岸成本",
    consolidated: en ? "Consolidated (USD)" : "汇总（USD）",
    noRows: en ? "No forecast cash-flow lines in your regions." : "当前区域下无可用于汇总的 Forecast 现金流行。",
    noPo: en ? "No PO numbers found on those lines." : "这些行上没有 PO 编号。",
    cannotCompute: en ? "No computable landed cost for this PO (check incoterm, tariff, unit price, supplier)." : "该 PO 暂无可计算的到岸成本（请检查贸易条款、关税、单价、供应商等）。",
  };

  const { poOptions, totalByPo } = useMemo(() => {
    const totalByPo = new Map<string, number>();
    const poSet = new Set<string>();
    for (const row of rows) {
      const key = poKey(row);
      poSet.add(key);
      const lt = lineLandedTotalUsd(row);
      if (lt != null && Number.isFinite(lt)) {
        totalByPo.set(key, (totalByPo.get(key) ?? 0) + lt);
      }
    }
    const poOptions = [...poSet].sort((a, b) => {
      const ae = a === "";
      const be = b === "";
      if (ae && !be) return 1;
      if (!ae && be) return -1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });
    return { poOptions, totalByPo };
  }, [rows]);

  const [selectedPo, setSelectedPo] = useState("");

  const landedValue = selectedPo === "" ? null : totalByPo.get(selectedPo);
  const landedLabel =
    selectedPo === ""
      ? ""
      : landedValue != null && Number.isFinite(landedValue)
        ? formatUsd(landedValue, 2)
        : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-app-muted">{t.hint}</p>

      <section className="app-panel p-5 sm:p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">{t.title}</h3>

        {rows.length === 0 ? (
          <p className="text-sm text-app-muted">{t.noRows}</p>
        ) : poOptions.length === 0 || (poOptions.length === 1 && poOptions[0] === "") ? (
          <p className="text-sm text-app-muted">{t.noPo}</p>
        ) : (
          <div className="grid max-w-xl gap-4">
            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">{t.poOrder}</span>
              <select
                value={selectedPo}
                onChange={(e) => setSelectedPo(e.target.value)}
                className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-foreground"
              >
                <option value="">{t.selectPo}</option>
                {poOptions.map((po) => (
                  <option key={po || "__empty__"} value={po}>
                    {po ? po : t.emptyPo}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">{t.landedCost}</span>
              <span className="mb-1 block text-xs text-app-muted">{t.consolidated}</span>
              <input
                readOnly
                value={selectedPo === "" ? "" : landedLabel != null ? landedLabel : "—"}
                placeholder={selectedPo === "" ? (en ? "Select a PO" : "请选择 PO") : ""}
                className="w-full rounded-lg border border-app-border bg-gray-50 px-3 py-2 text-sm font-medium text-foreground tabular-nums"
              />
            </label>
            {selectedPo !== "" && landedLabel == null ? (
              <p className="text-sm text-app-muted">{t.cannotCompute}</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
