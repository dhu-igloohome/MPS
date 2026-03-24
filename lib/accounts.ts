import { Region, UserAccount } from "@/lib/types";

export const REGIONS: Region[] = ["APAC", "EU", "USA"];

export const OFFICES_BY_REGION: Record<Region, string[]> = {
  APAC: [
    "新加坡 (Singapore) - 总部",
    "中国 深圳 (Shenzhen)",
    "越南 胡志明市 (Ho Chi Minh City)",
    "菲律宾 马尼拉 (Manila)",
    "泰国 曼谷 (Bangkok)",
    "马来西亚 吉隆坡 (Kuala Lumpur)",
    "印度 班加罗尔 (Bengaluru)",
    "印度尼西亚 雅加达 (Jakarta)",
    "日本 东京 (Tokyo)",
    "澳大利亚 悉尼 (Sydney)",
  ],
  EU: ["英国 达文特里 (Daventry)", "爱尔兰 布雷 (Bray)"],
  USA: ["美国 奥斯汀 (Austin)"],
};

const ALL_REGIONS = [...REGIONS];

export const USER_ACCOUNTS: UserAccount[] = [
  {
    username: "david",
    password: "david123",
    displayName: "David",
    role: "super_admin",
    regions: ALL_REGIONS,
  },
  {
    username: "apac_admin",
    password: "apac123",
    displayName: "APAC Admin",
    role: "regional_admin",
    regions: ["APAC"],
  },
  {
    username: "eu_admin",
    password: "eu123",
    displayName: "EU Admin",
    role: "regional_admin",
    regions: ["EU"],
  },
  {
    username: "usa_admin",
    password: "usa123",
    displayName: "USA Admin",
    role: "regional_admin",
    regions: ["USA"],
  },
];
