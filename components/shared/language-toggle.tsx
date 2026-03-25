"use client";

import { useRouter } from "next/navigation";

import { Language } from "@/lib/i18n";

type LanguageToggleProps = {
  language: Language;
};

export function LanguageToggle({ language }: LanguageToggleProps) {
  const router = useRouter();

  function toggleLanguage() {
    const nextLanguage: Language = language === "en" ? "zh" : "en";
    document.cookie = `lang=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      className="rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-foreground hover:border-app-accent/40 hover:bg-app-accent-soft"
    >
      {language === "en" ? "中文" : "EN"}
    </button>
  );
}
