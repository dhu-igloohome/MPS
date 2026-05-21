"use client";

import { Globe } from "lucide-react";
import { useRouter } from "next/navigation";

import { Language } from "@/lib/i18n";

type LanguageToggleProps = {
  language: Language;
};

const segmentBase =
  "min-w-[2.75rem] rounded-md px-2.5 py-1.5 text-xs font-semibold tracking-wide transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(238,100,84,0.4)]";

export function LanguageToggle({ language }: LanguageToggleProps) {
  const router = useRouter();

  function setLanguage(next: Language) {
    if (next === language) return;
    document.cookie = `lang=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-xl border border-app-border/90 bg-slate-50/90 p-0.5 shadow-sm ring-1 ring-black/[0.03]"
      role="group"
      aria-label={language === "en" ? "Language" : "语言"}
    >
      <Globe size={14} strokeWidth={1.75} className="ml-1.5 shrink-0 text-app-muted" aria-hidden />
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`${segmentBase} ${
          language === "en"
            ? "bg-white text-app-accent shadow-sm ring-1 ring-black/[0.06]"
            : "text-app-muted hover:text-foreground"
        }`}
        aria-pressed={language === "en"}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage("zh")}
        className={`${segmentBase} ${
          language === "zh"
            ? "bg-white text-app-accent shadow-sm ring-1 ring-black/[0.06]"
            : "text-app-muted hover:text-foreground"
        }`}
        aria-pressed={language === "zh"}
      >
        中文
      </button>
    </div>
  );
}
