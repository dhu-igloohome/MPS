import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { UserManagement } from "@/components/admin/user-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listAdminAuditLogs, listUsersWithRegions } from "@/lib/repositories";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (session.role !== "super_admin") {
    redirect("/dashboard");
  }

  const users = await listUsersWithRegions();
  const auditLogs = await listAdminAuditLogs(80);
  const cookieStore = await cookies();
  const language = normalizeLanguage(cookieStore.get("lang")?.value);

  return (
    <AppShell
      session={session}
      title={language === "en" ? "User Management" : "用户管理"}
      description={
        language === "en" ? "Create office accounts and manage regional permissions." : "创建办公室账号并管理区域权限。"
      }
    >
      <UserManagement users={users} auditLogs={auditLogs} language={language} />
    </AppShell>
  );
}
