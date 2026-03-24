import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LogisticsProgressPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell
      session={session}
      title="物流进度 | Logistics Progress"
      description="模块预留：后续用于物流状态和节点跟踪。"
    >
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-zinc-900">开发中...</p>
      </section>
    </AppShell>
  );
}
