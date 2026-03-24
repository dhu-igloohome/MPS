import { ForecastEntry, Region } from "@/lib/types";

type CreateForecastInput = {
  month: string;
  region: Region;
  office: string;
  productName: string;
  sku: string;
  buildToOrder: number;
  buildToStock: number;
  createdBy: string;
};

const forecasts: ForecastEntry[] = [];

function nowIso() {
  return new Date().toISOString();
}

function nextId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function addForecast(input: CreateForecastInput) {
  const entry: ForecastEntry = {
    id: nextId(),
    month: input.month,
    region: input.region,
    office: input.office,
    productName: input.productName.trim(),
    sku: input.sku.trim(),
    buildToOrder: Number(input.buildToOrder) || 0,
    buildToStock: Number(input.buildToStock) || 0,
    createdBy: input.createdBy,
    createdAt: nowIso(),
  };

  forecasts.unshift(entry);
  return entry;
}

export function listForecasts() {
  return [...forecasts];
}

export function listForecastsByRegions(regions: Region[]) {
  return forecasts.filter((item) => regions.includes(item.region));
}

export function getSummaryByMonthAndRegion(regions?: Region[]) {
  const source = regions ? listForecastsByRegions(regions) : listForecasts();
  const map = new Map<
    string,
    { month: string; region: Region; buildToOrder: number; buildToStock: number }
  >();

  for (const item of source) {
    const key = `${item.month}-${item.region}`;
    const current = map.get(key) || {
      month: item.month,
      region: item.region,
      buildToOrder: 0,
      buildToStock: 0,
    };
    current.buildToOrder += item.buildToOrder;
    current.buildToStock += item.buildToStock;
    map.set(key, current);
  }

  return [...map.values()].sort((a, b) => {
    if (a.month === b.month) {
      return a.region.localeCompare(b.region);
    }
    return b.month.localeCompare(a.month);
  });
}
