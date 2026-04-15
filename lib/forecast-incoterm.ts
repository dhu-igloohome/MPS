import type { Language } from "@/lib/i18n";

export const FORECAST_INCOTERMS = ["EXW", "FOB", "DAP", "DDP"] as const;
export type ForecastIncoterm = (typeof FORECAST_INCOTERMS)[number];

export function parseForecastIncoterm(raw: unknown): ForecastIncoterm | null {
  const s = String(raw ?? "").trim().toUpperCase();
  return (FORECAST_INCOTERMS as readonly string[]).includes(s) ? (s as ForecastIncoterm) : null;
}

/** Coerce DB / legacy values; unknown strings fall back to EXW. */
export function normalizeForecastIncotermStored(raw: string | null | undefined): ForecastIncoterm {
  return parseForecastIncoterm(raw) ?? "EXW";
}

const HINT_EN: Record<ForecastIncoterm, string> = {
  EXW:
    'EXW, short for "Ex Works," places most responsibility with the buyer. The seller is expected to have the goods ready for collection at the agreed place of delivery (commonly the seller\'s factory, mill, plant or warehouse). The buyer is accountable for all subsequent costs and risk, including all export procedures, starting with loading the goods onto a transport vehicle at the seller\'s premises.',
  FOB: `On FOB shipments sellers are kept free of their responsibilities and finish when they hand over their goods to the nominated forwarders of their buyer. Suppliers will simply get their goods ready, make an invoice and packing list, and prepare the shipment booking sheet for the forwarder. Once the goods are handed over to the forwarder, it's now the forwarder's responsibility to contact the shipping line and get the insurance for the goods. In these cases, the buyer of the goods settles the arrangements of the forwarder in two ways: prepaid and collect basis. A prepaid basis shipment means the buyer will pay the freight charges before the shipment occurs. For collect basis shipments buyers can pay the forwarders in his country after goods arrive at the port and they have been notified of the shipment.`,
  DAP: "Under DAP, the seller delivers to a location, but the buyer handles import customs, duties, and taxes.",
  DDP: "Under DDP, the seller covers all costs, including import duties, taxes, and customs clearance.",
};

const HINT_ZH: Record<ForecastIncoterm, string> = {
  EXW:
    "EXW（工厂交货）：卖方在约定地点（多为卖方工厂/仓库）将货物备妥供买方提取；买方承担之后全部费用与风险，包括出口手续及在卖方处将货装上运输工具等。",
  FOB:
    "FOB（装运港船上交货）：卖方将货交买方指定货代后即完成责任；卖方备货、发票、装箱单及订舱资料交货代后，由货代联系船公司与办理货运险。买方与货代的运费安排分预付（装运前付运费）与到付（货到目的港、收到通知后再向货代付款）等方式。",
  DAP: "DAP（目的地交货）：卖方负责将货物运至约定地点交货；进口清关、关税及其他进口税费由买方负责。",
  DDP: "DDP（完税后交货）：卖方承担直至交货的全部费用与风险，包括进口关税、税金及进口清关。",
};

export function forecastIncotermHint(incoterm: ForecastIncoterm, language: Language): string {
  return language === "en" ? HINT_EN[incoterm] : HINT_ZH[incoterm];
}
