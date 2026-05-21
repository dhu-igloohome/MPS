"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Lock, User } from "lucide-react";

import { Language, normalizeLanguage } from "@/lib/i18n";
import { toast } from "@/lib/app-toast";

const TEXT = {
  en: {
    title: "Igloo Foretracker",
    subtitle: "For username and password setup, contact David Huang.",
    username: "Username",
    password: "Password",
    login: "Login",
    toggle: "中文",
    error: "Invalid username or password.",
    errorServer:
      "Service temporarily unavailable. Try again later or contact your admin (check database connection).",
    errorNetwork: "Could not reach the server. Check your network and try again.",
    loginSuccess: "Signed in successfully.",
    langSwitchToZh: "Switched to 中文.",
    langSwitchToEn: "Switched to English.",
  },
  zh: {
    title: "igloo订单追踪系统",
    subtitle: "登录用户名与密码创建请联系David Huang。",
    username: "用户名",
    password: "密码",
    login: "登录",
    toggle: "EN",
    error: "用户名或密码错误。",
    errorServer: "服务暂时不可用，请稍后重试或联系管理员（例如数据库未连接）。",
    errorNetwork: "无法连接服务器，请检查网络后重试。",
    loginSuccess: "登录成功。",
    langSwitchToZh: "已切换为中文。",
    langSwitchToEn: "已切换为 English。",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof document === "undefined") {
      return "zh";
    }
    const cookieText = document.cookie
      .split("; ")
      .find((item) => item.startsWith("lang="))
      ?.split("=")[1];
    return normalizeLanguage(cookieText);
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const t = TEXT[language];

  function onToggleLanguage() {
    const nextLanguage: Language = language === "en" ? "zh" : "en";
    setLanguage(nextLanguage);
    document.cookie = `lang=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
    toast.success(nextLanguage === "zh" ? t.langSwitchToZh : t.langSwitchToEn, { duration: 2200 });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    let response: Response;
    try {
      response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      setLoading(false);
      toast.error(t.errorNetwork);
      return;
    }

    setLoading(false);

    if (!response.ok) {
      if (response.status >= 500 || response.status === 503) {
        toast.error(t.errorServer);
        return;
      }
      toast.error(t.error);
      return;
    }

    toast.success(t.loginSuccess, { duration: 2000 });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#F9FAFB] px-4 py-10">
      <section className="w-full max-w-xl rounded-2xl border border-app-border/90 bg-white p-6 shadow-[0_20px_40px_rgba(17,24,39,0.06)] sm:p-8 sm:px-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Image
              src="/igloo-logo-pinge.svg"
              alt="Igloo logo"
              width={87}
              height={24}
              priority
            />
            <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">{t.title}</h1>
            <p className="mt-2 text-sm text-[#4B5563]">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onToggleLanguage}
            className="app-button-secondary inline-flex items-center gap-2 px-3 py-1.5 text-sm"
          >
            <Globe size={15} strokeWidth={1.5} />
            {t.toggle}
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-foreground">{t.username}</span>
            <div className="relative">
              <User size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                className="w-full bg-white py-2 pl-10 pr-3"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-foreground">{t.password}</span>
            <div className="relative">
              <Lock size={16} strokeWidth={1.5} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full bg-white py-2 pl-10 pr-3"
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="app-button-primary w-full px-4 py-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "..." : t.login}
          </button>
        </form>
      </section>
    </main>
  );
}
