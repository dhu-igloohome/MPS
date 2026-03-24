"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Language, normalizeLanguage } from "@/lib/i18n";

const TEXT = {
  en: {
    title: "igloo ForeTracker",
    subtitle: "Sign in to submit monthly forecasts by region.",
    username: "Username",
    password: "Password",
    login: "Login",
    toggle: "中文",
    error: "Invalid username or password.",
    officeTimeTitle: "Current Time by Office (24-hour format)",
  },
  zh: {
    title: "igloo订单追踪系统",
    subtitle: "登录后可按区域录入月度订单 forecast。",
    username: "用户名",
    password: "密码",
    login: "登录",
    toggle: "EN",
    error: "用户名或密码错误。",
    officeTimeTitle: "13个办公室当前时间（24小时制）",
  },
};

const OFFICE_TIMEZONES = [
  { office: "新加坡 (Singapore) - 总部", timeZone: "Asia/Singapore" },
  { office: "中国 深圳 (Shenzhen)", timeZone: "Asia/Shanghai" },
  { office: "美国 奥斯汀 (Austin)", timeZone: "America/Chicago" },
  { office: "越南 胡志明市 (Ho Chi Minh City)", timeZone: "Asia/Ho_Chi_Minh" },
  { office: "菲律宾 马尼拉 (Manila)", timeZone: "Asia/Manila" },
  { office: "泰国 曼谷 (Bangkok)", timeZone: "Asia/Bangkok" },
  { office: "马来西亚 吉隆坡 (Kuala Lumpur)", timeZone: "Asia/Kuala_Lumpur" },
  { office: "印度 班加罗尔 (Bengaluru)", timeZone: "Asia/Kolkata" },
  { office: "印度尼西亚 雅加达 (Jakarta)", timeZone: "Asia/Jakarta" },
  { office: "日本 东京 (Tokyo)", timeZone: "Asia/Tokyo" },
  { office: "澳大利亚 悉尼 (Sydney)", timeZone: "Australia/Sydney" },
  { office: "英国 达文特里 (Daventry)", timeZone: "Europe/London" },
  { office: "爱尔兰 布雷 (Bray)", timeZone: "Europe/Dublin" },
];

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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const t = TEXT[language];

  function formatOfficeTime(timeZone: string) {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(now);
  }

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  function onToggleLanguage() {
    const nextLanguage: Language = language === "en" ? "zh" : "en";
    setLanguage(nextLanguage);
    document.cookie = `lang=${nextLanguage}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (!response.ok) {
      setError(t.error);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-100 px-4 py-10">
      <div className="w-full max-w-3xl space-y-4">
        <section className="mx-auto w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Image
              src="/igloo-logo-pinge.svg"
              alt="Igloo logo"
              width={87}
              height={24}
              priority
            />
            <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
            <p className="mt-2 text-sm text-zinc-600">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onToggleLanguage}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            {t.toggle}
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">{t.username}</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">{t.password}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 outline-none ring-indigo-500 focus:ring-2"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "..." : t.login}
          </button>
        </form>
        </section>
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">{t.officeTimeTitle}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {OFFICE_TIMEZONES.map((item) => (
              <div
                key={item.office}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
              >
                <span className="text-zinc-700">{item.office}</span>
                <span className="font-mono text-zinc-900">{formatOfficeTime(item.timeZone)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
