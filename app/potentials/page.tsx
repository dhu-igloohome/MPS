"use client";

import { FormEvent, useState } from "react";

const PARENT_CATEGORIES = [
  { id: "locks", label: "Locks", labelZh: "锁" },
  { id: "keyboxes", label: "Keyboxes", labelZh: "钥匙盒" },
  { id: "boxes", label: "Boxes", labelZh: "箱子" },
  { id: "controllers", label: "Controllers", labelZh: "控制器" },
] as const;

type CategoryId = (typeof PARENT_CATEGORIES)[number]["id"];

export default function PotentialsPage() {
  const [activeId, setActiveId] = useState<CategoryId>("locks");
  const [draftByCategory, setDraftByCategory] = useState<Record<CategoryId, string>>({
    locks: "",
    keyboxes: "",
    boxes: "",
    controllers: "",
  });
  const [lastSubmitted, setLastSubmitted] = useState<{
    id: CategoryId;
    text: string;
  } | null>(null);

  const active = PARENT_CATEGORIES.find((c) => c.id === activeId)!;
  const draft = draftByCategory[activeId];

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLastSubmitted({ id: activeId, text: draft });
  }

  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-semibold text-zinc-900">Potentials</h1>
          <p className="mt-1 text-sm text-zinc-600">
            四个父级目录（与 ForeTracker 无数据互通）。按分类填写后提交，仅在当前页回显。
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
            父级目录
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {PARENT_CATEGORIES.map((cat) => {
              const selected = cat.id === activeId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveId(cat.id)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selected
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : "border-zinc-200 bg-zinc-50 text-zinc-800 hover:border-zinc-300"
                  }`}
                >
                  <span className="font-semibold">{cat.label}</span>
                  <span className={selected ? "text-zinc-300" : "text-zinc-500"}>
                    {" "}
                    （{cat.labelZh}）
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            {active.label}（{active.labelZh}）
          </h2>
          <p className="mt-1 text-sm text-zinc-600">在此分类下输入需求或备注。</p>

          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm text-zinc-700">内容</span>
              <textarea
                value={draft}
                onChange={(e) =>
                  setDraftByCategory((prev) => ({ ...prev, [activeId]: e.target.value }))
                }
                rows={5}
                placeholder="例如：davidhuang testing..."
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none ring-indigo-500 focus:ring-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              提交（当前分类）
            </button>
          </form>

          {lastSubmitted ? (
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
              <p className="font-medium">已收到（仅前端回显，未写入 ForeTracker 数据库）</p>
              <p className="mt-2 text-emerald-800">
                分类：
                {PARENT_CATEGORIES.find((c) => c.id === lastSubmitted.id)?.label}
                （
                {PARENT_CATEGORIES.find((c) => c.id === lastSubmitted.id)?.labelZh}）
              </p>
              <p className="mt-2 whitespace-pre-wrap font-mono text-emerald-950">
                {lastSubmitted.text || "（空）"}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
