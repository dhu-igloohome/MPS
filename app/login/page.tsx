"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { Language, normalizeLanguage } from "@/lib/i18n";

const TEXT = {
  en: {
    title: "igloo ForeTracker",
    subtitle: "For username and password setup, contact David Huang.",
    username: "Username",
    password: "Password",
    login: "Login",
    toggle: "中文",
    error: "Invalid username or password.",
  },
  zh: {
    title: "igloo订单追踪系统",
    subtitle: "登录用户名与密码创建请联系David Huang。",
    username: "用户名",
    password: "密码",
    login: "登录",
    toggle: "EN",
    error: "用户名或密码错误。",
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
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const t = TEXT[language];

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
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-app-border/90 bg-app-surface/95 p-6 shadow-lg shadow-slate-900/5 backdrop-blur-sm sm:p-8">
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
            className="rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-foreground hover:border-app-accent/40 hover:bg-app-accent-soft"
          >
            {t.toggle}
          </button>
        </div>

        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-foreground">{t.username}</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
              className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 outline-none ring-app-accent focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm text-foreground">{t.password}</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="w-full rounded-lg border border-app-border bg-app-surface px-3 py-2 outline-none ring-app-accent focus:ring-2"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-app-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "..." : t.login}
          </button>
        </form>
      </section>
    </main>
  );
}
