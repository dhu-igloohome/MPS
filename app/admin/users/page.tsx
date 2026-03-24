import { redirect } from "next/navigation";

import { UserManagement } from "@/components/admin/user-management";
import { AppShell } from "@/components/shared/app-shell";
import { listUsersWithRegions } from "@/lib/repositories";
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

  return (
    <AppShell
      session={session}
      title="User Management"
      description="Create office accounts and manage regional permissions."
    >
      <UserManagement users={users} />
    </AppShell>
  );
}
