"use client";

import { FormEvent, useState } from "react";

export default function PotentialsPage() {
  const [text, setText] = useState("davidhuang tesing...");
  const [submitted, setSubmitted] = useState<string | null>(null);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(text);
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10">
      <div className="mx-auto w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Potentials</h1>
        <p className="mt-1 text-sm text-zinc-600">
          独立测试页（与 ForeTracker 无数据互通）。提交后仅在当前页面回显内容。
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm text-zinc-700">输入内容</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            提交测试
          </button>
        </form>

        {submitted !== null ? (
          <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <p className="font-medium">已收到（仅前端回显，未写入 ForeTracker 数据库）：</p>
            <p className="mt-2 whitespace-pre-wrap font-mono text-emerald-950">{submitted}</p>
          </div>
        ) : null}
      </div>
    </main>
  );
}
