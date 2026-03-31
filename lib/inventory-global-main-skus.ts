export const INVENTORY_GLOBAL_MAIN_SKU_OPTIONS = [
  "IGB4",
  "IGK3",
  "IGM3",
  "IGM4",
  "RG1",
  "MP1F",
  "ML5",
  "IEF1",
  "IGP1",
  "SK3",
  "SP1",
  "INB1",
  "EB1",
  "RW1",
  "IGR1",
  "RM2",
  "RM2F",
  "EK1",
  "EK2",
  "OE1",
  "SP2",
  "SP3",
  "DBX",
  "SW1",
  "ER1",
  "MT1",
  "LLX5E",
  "SK4X",
  "DAX",
] as const;

export function isInventoryGlobalMainSku(value: string): boolean {
  return INVENTORY_GLOBAL_MAIN_SKU_OPTIONS.includes(
    value as (typeof INVENTORY_GLOBAL_MAIN_SKU_OPTIONS)[number],
  );
}
