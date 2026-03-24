import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OrderProgressPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "Order Progress" : "订单进度"}
      description={
        language === "en"
          ? "Module placeholder: used for order execution progress tracking in future iterations."
          : "模块预留：后续用于订单执行进度跟踪。"
      }
    >
      <section className="rounded-2xl border border-zinc-200 bg-white p-8 text-center">
        <p className="text-lg font-semibold text-zinc-900">
          {language === "en" ? "Under development..." : "开发中..."}
        </p>
      </section>
    </AppShell>
  );
}
