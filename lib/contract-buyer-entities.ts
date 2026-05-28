export type ContractBuyerEntityCode = "shenzhen" | "singapore";

export type ContractBuyerEntity = {
  code: ContractBuyerEntityCode;
  legalName: string;
  address: string;
  contactName?: string;
  contactPhone?: string;
  email?: string;
  companyRegNo?: string;
  gstRegNo?: string;
};

export const CONTRACT_BUYER_ENTITIES: Record<ContractBuyerEntityCode, ContractBuyerEntity> = {
  shenzhen: {
    code: "shenzhen",
    legalName: "深圳市伊格鲁科技有限公司",
    address: "深圳市宝安区西乡街道共和工业路华丰互联网创意园A座205",
  },
  singapore: {
    code: "singapore",
    legalName: "Igloocompany Pte Ltd",
    address: "71 Ayer Rajah Crescent #01-25, Singapore 139951",
    companyRegNo: "201528946R",
    gstRegNo: "201528946R",
  },
};

/** Domestic supplier → Shenzhen; non-domestic → Singapore (phase 1). */
export function resolveBuyerEntityCode(supplierIsDomesticContract: boolean): ContractBuyerEntityCode {
  return supplierIsDomesticContract ? "shenzhen" : "singapore";
}

export function getContractBuyerEntity(code: ContractBuyerEntityCode): ContractBuyerEntity {
  return CONTRACT_BUYER_ENTITIES[code];
}

export function formatBuyerEntityLabel(code: ContractBuyerEntityCode, language: "en" | "zh"): string {
  const e = CONTRACT_BUYER_ENTITIES[code];
  return language === "en" ? `${e.legalName} (${code})` : `${e.legalName}`;
}
