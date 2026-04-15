import type { Language } from "@/lib/i18n";

/**
 * ISO 3166-1 alpha-2 codes (slim-2 set). Used with Intl.DisplayNames for EN/ZH labels.
 * TW / HK / MO use business-friendly English + user-required Chinese labels.
 */
const ISO_ALPHA2_REGIONS = `AF AX AL DZ AS AD AO AI AQ AG AR AM AW AU AT AZ BS BH BD BB BY BE BZ BJ BM BT BO BQ BA BW BV BR IO BN BG BF BI CV KH CM CA KY CF TD CL CN CX CC CO KM CG CD CK CR CI HR CU CW CY CZ DK DJ DM DO EC EG SV GQ ER EE SZ ET FK FO FJ FI FR GF PF TF GA GM GE DE GH GI GR GL GD GP GU GT GG GN GW GY HT HM VA HN HK HU IS IN ID IR IQ IE IM IL IT JM JP JE JO KZ KE KI KP KR KW KG LA LV LB LS LR LY LI LT LU MO MG MW MY MV ML MT MH MQ MR MU YT MX FM MD MC MN ME MS MA MZ MM NA NR NP NL NC NZ NI NE NG NU NF MK MP NO OM PK PW PS PA PG PY PE PH PN PL PT PR QA RE RO RU RW BL SH KN LC MF PM VC WS SM ST SA SN RS SC SL SG SX SK SI SB SO ZA GS SS ES LK SD SR SJ SE CH SY TW TJ TZ TH TL TG TK TO TT TN TR TM TC TV UG UA AE GB US UM UY UZ VU VE VN VG VI WF EH YE ZM ZW`.split(/\s+/);

const REGION_LABEL_OVERRIDE: Record<string, { en: string; zh: string }> = {
  TW: { en: "Taiwan, China", zh: "中国台湾" },
  HK: { en: "Hong Kong, China", zh: "中国香港" },
  MO: { en: "Macau, China", zh: "中国澳门" },
};

export type ForecastDestinationOption = {
  /** Stored in `forecasts.destination` — English canonical name */
  value: string;
  labelEn: string;
  labelZh: string;
};

/** Allow country names with commas, hyphens, apostrophes, parentheses, and Unicode letters (CSV / legacy). */
export const FORECAST_DESTINATION_INPUT_RE = /^[\p{L}\p{N},.'\-\s()]+$/u;

export function buildForecastDestinationOptions(): ForecastDestinationOption[] {
  const enDn = new Intl.DisplayNames(["en"], { type: "region" });
  const zhDn = new Intl.DisplayNames(["zh-CN"], { type: "region" });
  const out: ForecastDestinationOption[] = [];
  for (const code of ISO_ALPHA2_REGIONS) {
    const ov = REGION_LABEL_OVERRIDE[code];
    const labelEn = ov?.en ?? enDn.of(code) ?? code;
    const labelZh = ov?.zh ?? zhDn.of(code) ?? code;
    out.push({ value: labelEn, labelEn, labelZh });
  }
  return out.sort((a, b) => a.labelEn.localeCompare(b.labelEn, "en"));
}

export function forecastDestinationDisplay(
  stored: string,
  language: Language,
  options: readonly ForecastDestinationOption[],
): string {
  const v = stored.trim();
  const hit = options.find((o) => o.value === v);
  if (hit) return language === "en" ? hit.labelEn : hit.labelZh;
  return stored;
}

/** If current DB value is not in the Intl list, keep it selectable (legacy / CSV). */
export function withLegacyForecastDestination(
  current: string,
  options: readonly ForecastDestinationOption[],
): ForecastDestinationOption[] {
  const v = current.trim();
  if (!v) return [...options];
  if (options.some((o) => o.value === v)) return [...options];
  return [...options, { value: v, labelEn: v, labelZh: v }].sort((a, b) =>
    a.labelEn.localeCompare(b.labelEn, "en"),
  );
}

export function isForecastDestinationInputValid(s: string): boolean {
  const t = s.trim();
  if (t.length === 0 || t.length > 160) return false;
  return FORECAST_DESTINATION_INPUT_RE.test(t);
}
