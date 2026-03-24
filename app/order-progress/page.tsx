import { redirect } from "next/navigation";

import { AppShell } from "@/components/shared/app-shell";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrderProgressPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <AppShell
      session={session}
      title="订单进度 | Order Progress"
      description="模块预留：后续用于订单执行进度跟踪。"
    >
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-zinc-900">开发中...</p>
      </section>
    </AppShell>
  );
}
