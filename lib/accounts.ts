import { Region, UserAccount } from "@/lib/types";

export const REGIONS: Region[] = ["APAC", "EU", "USA"];

export const OFFICES_BY_REGION: Record<Region, string[]> = {
  APAC: ["Singapore", "Shanghai", "Tokyo", "Seoul", "Sydney"],
  EU: ["London", "Berlin", "Paris", "Amsterdam"],
  USA: ["New York", "San Francisco", "Austin", "Chicago"],
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

export function findAccount(username: string) {
  return USER_ACCOUNTS.find((item) => item.username === username);
}
