"use client";

import { useMemo, useState } from "react";

import { formatUsd } from "@/lib/format-usd";
import {
  buildForecastDestinationOptions,
  isForecastDestinationInputValid,
  withLegacyForecastDestination,
} from "@/lib/forecast-destination-countries";
import { normalizeForecastIncotermStored, type ForecastIncoterm } from "@/lib/forecast-incoterm";
import type { Language } from "@/lib/i18n";
import { computeLandedCostPerUnitUsd } from "@/lib/landed-cost-cash-flow";
import type { ForecastCashFlowRow, UnitCostQuoteEntry } from "@/lib/types";

type Props = {
  language: Language;
  rows: ForecastCashFlowRow[];
  unitCostQuotes: UnitCostQuoteEntry[];
};

function poKey(row: ForecastCashFlowRow): string {
  return row.poNumber.trim();
}

/** Latest unit-cost quote for SKU + supplier, optionally as of quote date (YYYY-MM-DD inclusive). */
function resolveQuoteForRow(
  row: ForecastCashFlowRow,
  quotes: readonly UnitCostQuoteEntry[],
  asOfDateYmd: string,
): UnitCostQuoteEntry | null {
  const sku = row.sku.trim();
  const sup = row.cashFlowSupplierName.trim();
  if (!sup) return null;
  const cutoff = asOfDateYmd.trim();
  const candidates = quotes.filter((q) => {
    if (q.sku.trim() !== sku || q.supplierName.trim() !== sup) return false;
    if (!cutoff) return true;
    return q.quoteDate <= cutoff;
  });
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const c = b.quoteDate.localeCompare(a.quoteDate);
    if (c !== 0) return c;
    return Number(b.id) - Number(a.id);
  })[0]!;
}

function optPctOverride(form: string, quoteVal: number | null | undefined): number | null {
  const t = form.trim();
  if (t !== "") {
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0 || n > 100) return null;
    return n;
  }
  return quoteVal ?? null;
}

function optUsdOverride(form: string, quoteVal: number | null | undefined): number | null {
  const t = form.trim();
  if (t !== "") {
    const n = Number(t);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  }
  return quoteVal ?? null;
}

function computeConsolidatedUsd(
  rows: ForecastCashFlowRow[],
  selectedPo: string,
  quotes: readonly UnitCostQuoteEntry[],
  quoteDateYmd: string,
  incoterm: ForecastIncoterm,
  destTariffForm: string,
  seaForm: string,
  airForm: string,
): number | null {
  let sum = 0;
  let anyLine = false;
  for (const row of rows) {
    if (poKey(row) !== selectedPo) continue;
    const q = resolveQuoteForRow(row, quotes, quoteDateYmd);
    const unit = q != null ? q.unitPrice : row.unitPriceUsd;
    const tariff = optPctOverride(destTariffForm, q?.destinationTariffPct);
    const sea = optUsdOverride(seaForm, q?.seaFreightUnitPrice);
    const air = optUsdOverride(airForm, q?.airFreightUnitPrice);
    const landed = computeLandedCostPerUnitUsd({
      forecastIncoterm: incoterm,
      shippingMode: row.cashFlowShippingMode,
      unitPriceUsd: unit != null && Number.isFinite(unit) ? unit : null,
      destinationTariffPct: tariff,
      seaFreightUsd: sea,
      airFreightUsd: air,
    });
    const qty = Number(row.buildToOrder) + Number(row.buildToStock);
    if (landed == null || !Number.isFinite(qty) || qty <= 0) continue;
    anyLine = true;
    sum += landed * qty;
  }
  return anyLine ? sum : null;
}

export function LandedCostConsolidatePanel({ language, rows, unitCostQuotes }: Props) {
  const en = language === "en";
  const t = {
    title: en ? "Landed cost consolidate" : "到岸成本汇总",
    hint: en
      ? "Select a PO, set quote date and optional freight/tariff/incoterm (empty numeric fields use the matching unit-cost quote as of that date). Consolidated = Σ (landed USD/unit × BTO+BTS quantity)."
      : "选择 PO，设置报价日期及可选的运费/关税/贸易条款（数字留空则按该日期前最新单位成本报价取值）。汇总 = Σ（到岸单价 USD × BTO+BTS 数量）。",
    poOrder: en ? "PO order" : "PO 订单",
    selectPo: en ? "Select PO order…" : "选择 PO…",
    emptyPo: en ? "(no PO on file)" : "（无 PO）",
    quoteDate: en ? "Quote date" : "报价日期",
    destinationCountry: en ? "Destination country" : "目的国",
    selectDestinationCountry: en
      ? "Select destination country (optional)…"
      : "选择目的国（选填）…",
    destinationCountryHint: en
      ? "English name is stored; TW/HK/MO use Taiwan, China / Hong Kong, China / Macau, China."
      : "保存英文标准名称；台湾/香港/澳门在中文界面显示为中国台湾、中国香港、中国澳门。",
    destinationTariff: en ? "Destination tariff (%)" : "目的国关税 (%)",
    seaMode: en ? "Shipping: ocean" : "运输方式 · 海运",
    seaFreightUnit: en ? "Ocean freight (USD / unit)" : "海运运费单价 (USD)",
    airMode: en ? "Shipping: air" : "运输方式 · 空运",
    airFreightUnit: en ? "Air freight (USD / unit)" : "空运运费单价 (USD)",
    incoterm: "Incoterm",
    incotermExw: "EXW",
    incotermFob: "FOB",
    incotermDap: "DAP",
    incotermDdp: "DDP",
    optionalPh: en ? "Optional" : "选填",
    landedCost: en ? "Landed cost" : "到岸成本",
    consolidated: en ? "Consolidated (USD)" : "汇总（USD）",
    noRows: en ? "No forecast cash-flow lines in your regions." : "当前区域下无可用于汇总的 Forecast 现金流行。",
    noPo: en ? "No PO numbers found on those lines." : "这些行上没有 PO 编号。",
    cannotCompute: en
      ? "No computable landed cost for this PO (check incoterm FOB/DAP/DDP, tariff, unit price, supplier, quote date)."
      : "该 PO 暂无可计算的到岸成本（请检查贸易条款 FOB/DAP/DDP、关税、单价、供应商、报价日期等）。",
    destInvalid: en ? "Destination country is not a valid stored name." : "目的国名称无效，请从列表选择或按规范填写。",
  };

  const [selectedPo, setSelectedPo] = useState("");
  const [quoteDate, setQuoteDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [destinationCountry, setDestinationCountry] = useState("");
  const [destinationTariffPct, setDestinationTariffPct] = useState("");
  const [seaFreightUnitPrice, setSeaFreightUnitPrice] = useState("");
  const [airFreightUnitPrice, setAirFreightUnitPrice] = useState("");
  const [incoterm, setIncoterm] = useState<ForecastIncoterm>("EXW");

  const baseDestinationOptions = useMemo(() => buildForecastDestinationOptions(), []);
  const destinationOptions = useMemo(
    () => withLegacyForecastDestination(destinationCountry, baseDestinationOptions),
    [destinationCountry, baseDestinationOptions],
  );

  const poOptions = useMemo(() => {
    const poSet = new Set<string>();
    for (const row of rows) {
      poSet.add(poKey(row));
    }
    return [...poSet].sort((a, b) => {
      const ae = a === "";
      const be = b === "";
      if (ae && !be) return 1;
      if (!ae && be) return -1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [rows]);

  function applyPrefillForPo(po: string) {
    if (!po) return;
    const first = rows.find((r) => poKey(r) === po);
    if (!first) return;
    setDestinationCountry((first.destination || "").trim());
    setIncoterm(normalizeForecastIncotermStored(first.incoterm));
    const q = resolveQuoteForRow(first, unitCostQuotes, quoteDate);
    setDestinationTariffPct(q?.destinationTariffPct != null ? String(q.destinationTariffPct) : "");
    setSeaFreightUnitPrice(q?.seaFreightUnitPrice != null ? String(q.seaFreightUnitPrice) : "");
    setAirFreightUnitPrice(q?.airFreightUnitPrice != null ? String(q.airFreightUnitPrice) : "");
  }

  const consolidatedUsd = useMemo(() => {
    if (!selectedPo) return null;
    return computeConsolidatedUsd(
      rows,
      selectedPo,
      unitCostQuotes,
      quoteDate,
      incoterm,
      destinationTariffPct,
      seaFreightUnitPrice,
      airFreightUnitPrice,
    );
  }, [
    rows,
    selectedPo,
    unitCostQuotes,
    quoteDate,
    incoterm,
    destinationTariffPct,
    seaFreightUnitPrice,
    airFreightUnitPrice,
  ]);

  const landedLabel =
    selectedPo === ""
      ? ""
      : consolidatedUsd != null && Number.isFinite(consolidatedUsd)
        ? formatUsd(consolidatedUsd, 2)
        : null;

  const destInvalid =
    destinationCountry.trim() !== "" && !isForecastDestinationInputValid(destinationCountry);

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
          <div className="grid max-w-5xl gap-3 md:grid-cols-2 xl:grid-cols-3">
            <label className="block md:col-span-2 xl:col-span-3">
              <span className="mb-1 block text-sm text-foreground/85">{t.poOrder}</span>
              <select
                value={selectedPo}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedPo(v);
                  if (v) applyPrefillForPo(v);
                }}
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
              <span className="mb-1 block text-sm text-foreground/85">{t.quoteDate}</span>
              <input
                type="date"
                value={quoteDate}
                onChange={(e) => setQuoteDate(e.target.value)}
                className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
              />
            </label>

            <label className="block md:col-span-2 xl:col-span-2">
              <span className="mb-1 block text-sm text-foreground/85">{t.destinationCountry}</span>
              <select
                value={destinationCountry}
                onChange={(e) => setDestinationCountry(e.target.value)}
                className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
              >
                <option value="">{t.selectDestinationCountry}</option>
                {destinationOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {en ? opt.labelEn : opt.labelZh}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-app-muted">{t.destinationCountryHint}</span>
              {destInvalid ? <span className="mt-1 block text-xs text-red-600">{t.destInvalid}</span> : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">{t.destinationTariff}</span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={destinationTariffPct}
                onChange={(e) => setDestinationTariffPct(e.target.value)}
                className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                placeholder={t.optionalPh}
              />
            </label>

            <label className="block md:col-span-2 xl:col-span-2">
              <span className="mb-1 block text-sm text-foreground/85">{t.seaMode}</span>
              <span className="mb-1 block text-xs text-app-muted">{t.seaFreightUnit}</span>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={seaFreightUnitPrice}
                onChange={(e) => setSeaFreightUnitPrice(e.target.value)}
                className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                placeholder={t.optionalPh}
              />
            </label>

            <label className="block md:col-span-2 xl:col-span-2">
              <span className="mb-1 block text-sm text-foreground/85">{t.airMode}</span>
              <span className="mb-1 block text-xs text-app-muted">{t.airFreightUnit}</span>
              <input
                type="number"
                min={0}
                step="0.0001"
                value={airFreightUnitPrice}
                onChange={(e) => setAirFreightUnitPrice(e.target.value)}
                className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                placeholder={t.optionalPh}
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">{t.incoterm}</span>
              <select
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value as ForecastIncoterm)}
                className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
              >
                <option value="EXW">{t.incotermExw}</option>
                <option value="FOB">{t.incotermFob}</option>
                <option value="DAP">{t.incotermDap}</option>
                <option value="DDP">{t.incotermDdp}</option>
              </select>
            </label>

            <label className="block md:col-span-2 xl:col-span-3">
              <span className="mb-1 block text-sm text-foreground/85">{t.landedCost}</span>
              <span className="mb-1 block text-xs text-app-muted">{t.consolidated}</span>
              <input
                readOnly
                value={selectedPo === "" ? "" : landedLabel != null ? landedLabel : "—"}
                placeholder={selectedPo === "" ? (en ? "Select a PO" : "请选择 PO") : ""}
                className="w-full max-w-md rounded-lg border border-app-border bg-gray-50 px-3 py-2 text-sm font-medium text-foreground tabular-nums"
              />
            </label>
            {selectedPo !== "" && landedLabel == null && !destInvalid ? (
              <p className="text-sm text-app-muted md:col-span-2 xl:col-span-3">{t.cannotCompute}</p>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
