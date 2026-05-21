"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { Language } from "@/lib/i18n";
import { toast } from "@/lib/app-toast";

type LogoutButtonProps = {
  language?: Language;
};

export function LogoutButton({ language = "en" }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const en = language === "en";
  const label = en ? "Log out" : "退出";
  const loadingLabel = en ? "Signing out…" : "退出中…";

  async function onLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setLoading(false);
    toast.success(en ? "Signed out" : "已退出登录", { duration: 2000 });
    window.setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 400);
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-xl border border-app-border/90 bg-white px-3 py-1.5 text-sm font-medium text-foreground/85 shadow-sm ring-1 ring-black/[0.03] transition duration-150 ease-out hover:-translate-y-px hover:border-red-200/90 hover:bg-red-50 hover:text-red-700 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
      title={label}
    >
      <LogOut size={15} strokeWidth={1.75} aria-hidden />
      <span>{loading ? loadingLabel : label}</span>
    </button>
  );
}
