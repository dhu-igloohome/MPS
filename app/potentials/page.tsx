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
    <main className="min-h-dvh px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl space-y-5 sm:space-y-6">
        <div className="rounded-2xl border border-app-border/90 bg-app-surface/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <h1 className="text-xl font-semibold text-foreground">Potentials</h1>
          <p className="mt-1 text-sm text-app-muted">
            四个父级目录（与 ForeTracker 无数据互通）。按分类填写后提交，仅在当前页回显。
          </p>
        </div>

        <div className="rounded-2xl border border-app-border/90 bg-app-surface/95 p-4 shadow-sm backdrop-blur-sm">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-app-muted">
            父级目录
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PARENT_CATEGORIES.map((cat) => {
              const selected = cat.id === activeId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveId(cat.id)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                    selected
                      ? "border-app-accent bg-app-accent text-white shadow-md"
                      : "border-app-border/90 bg-app-accent-soft/40 text-foreground/90 hover:border-app-accent/40"
                  }`}
                >
                  <span className="font-semibold">{cat.label}</span>
                  <span className={selected ? "text-white/85" : "text-app-muted"}>
                    {" "}
                    （{cat.labelZh}）
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-app-border/90 bg-app-surface/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
          <h2 className="text-base font-semibold text-foreground">
            {active.label}（{active.labelZh}）
          </h2>
          <p className="mt-1 text-sm text-app-muted">在此分类下输入需求或备注。</p>

          <form className="mt-4 space-y-4" onSubmit={onSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm text-foreground/85">内容</span>
              <textarea
                value={draft}
                onChange={(e) =>
                  setDraftByCategory((prev) => ({ ...prev, [activeId]: e.target.value }))
                }
                rows={5}
                placeholder="例如：davidhuang testing..."
                className="w-full rounded-lg border border-app-border px-3 py-2 text-sm outline-none ring-app-accent focus:ring-2"
              />
            </label>
            <button
              type="submit"
              className="rounded-lg bg-app-accent px-4 py-2 text-sm font-medium text-white hover:bg-app-accent-hover"
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
