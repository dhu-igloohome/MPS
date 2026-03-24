export type Language = "en" | "zh";

export function normalizeLanguage(input: string | undefined | null): Language {
  return input === "en" ? "en" : "zh";
}
