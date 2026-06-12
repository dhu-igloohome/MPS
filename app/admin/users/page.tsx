import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { IntegrationApiKeysPanel } from "@/components/admin/integration-api-keys-panel";
import { UserManagement } from "@/components/admin/user-management";
import { AppShell } from "@/components/shared/app-shell";
import { normalizeLanguage } from "@/lib/i18n";
import { listAdminAuditLogs, listIntegrationApiKeys, listUsersWithRegions } from "@/lib/repositories";
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

  const [users, auditLogs, integrationKeys, cookieStore] = await Promise.all([
    listUsersWithRegions(),
    listAdminAuditLogs(80),
    listIntegrationApiKeys(),
    cookies(),
  ]);
  const language = normalizeLanguage(cookieStore.get("lang")?.value);
  const siteOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`
      : "http://localhost:3000");

  return (
    <AppShell
      session={session}
      title={language === "en" ? "User Management" : "用户管理"}
      description={
        language === "en" ? "Create office accounts and manage regional permissions." : "创建办公室账号并管理区域权限。"
      }
    >
      <UserManagement users={users} auditLogs={auditLogs} language={language} />
      <IntegrationApiKeysPanel keys={integrationKeys} language={language} siteOrigin={siteOrigin} />
    </AppShell>
  );
}
