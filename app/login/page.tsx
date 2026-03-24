"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Language = "en" | "zh";

const TEXT = {
  en: {
    title: "MPS Forecast Portal",
    subtitle: "Sign in to submit monthly forecasts by region.",
    username: "Username",
    password: "Password",
    login: "Login",
    toggle: "中文",
    error: "Invalid username or password.",
  },
  zh: {
    title: "MPS 预测填报系统",
    subtitle: "登录后可按区域录入月度订单 forecast。",
    username: "用户名",
    password: "密码",
    login: "登录",
    toggle: "EN",
    error: "用户名或密码错误。",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>("zh");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const t = TEXT[language];

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
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">{t.title}</h1>
            <p className="mt-2 text-sm text-zinc-600">{t.subtitle}</p>
          </div>
          <button
            type="button"
            onClick={() => setLanguage((prev) => (prev === "en" ? "zh" : "en"))}
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
    </main>
  );
}
