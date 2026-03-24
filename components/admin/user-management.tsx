"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { AdminUser, Region, UserRole } from "@/lib/types";

const ALL_REGIONS: Region[] = ["APAC", "EU", "USA"];

type UserManagementProps = {
  users: AdminUser[];
};

export function UserManagement({ users }: UserManagementProps) {
  const router = useRouter();
  const [editableUsers, setEditableUsers] = useState<AdminUser[]>(users);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("regional_admin");
  const [regions, setRegions] = useState<Region[]>(["APAC"]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEditableUsers(users);
  }, [users]);

  function toggleRegion(region: Region) {
    setRegions((prev) => {
      if (prev.includes(region)) {
        return prev.filter((item) => item !== region);
      }
      return [...prev, region];
    });
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        displayName,
        password,
        role,
        regions,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      setMessage("Create failed. Check username uniqueness and input fields.");
      return;
    }

    setMessage("User created.");
    setUsername("");
    setDisplayName("");
    setPassword("");
    setRole("regional_admin");
    setRegions(["APAC"]);
    router.refresh();
  }

  async function updateUser(user: AdminUser) {
    const newPassword = window.prompt(`Reset password for ${user.username} (leave blank to skip):`, "");
    const response = await fetch(`/api/admin/users/${encodeURIComponent(user.username)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: user.role,
        regions: user.regions,
        password: newPassword || undefined,
      }),
    });

    if (!response.ok) {
      setMessage("Update failed.");
      return;
    }

    setMessage(`Updated ${user.username}.`);
    router.refresh();
  }

  async function deleteUser(usernameToDelete: string) {
    if (!window.confirm(`Delete user ${usernameToDelete}?`)) {
      return;
    }

    const response = await fetch(`/api/admin/users/${encodeURIComponent(usernameToDelete)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage("Delete failed.");
      return;
    }

    setMessage(`Deleted ${usernameToDelete}.`);
    router.refresh();
  }

  function updateDraftRole(usernameToChange: string, nextRole: UserRole) {
    const nextUsers = editableUsers.map((item) =>
      item.username === usernameToChange ? { ...item, role: nextRole } : item,
    );
    setEditableUsers(nextUsers);
  }

  function updateDraftRegions(usernameToChange: string, region: Region) {
    const nextUsers = editableUsers.map((item) => {
      if (item.username !== usernameToChange) {
        return item;
      }
      const nextRegions = item.regions.includes(region)
        ? item.regions.filter((entry) => entry !== region)
        : [...item.regions, region];
      return { ...item, regions: nextRegions };
    });
    setEditableUsers(nextUsers);
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-zinc-900">Create Office Account</h3>
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={createUser}>
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="Display Name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="Initial Password (>= 6 chars)"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
          <select
            className="rounded-lg border border-zinc-300 px-3 py-2"
            value={role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            <option value="regional_admin">regional_admin</option>
            <option value="super_admin">super_admin</option>
          </select>

          <div className="md:col-span-2 flex flex-wrap gap-2">
            {ALL_REGIONS.map((region) => (
              <label
                key={region}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  checked={regions.includes(region)}
                  onChange={() => toggleRegion(region)}
                />
                {region}
              </label>
            ))}
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-60"
            >
              {loading ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-zinc-900">Existing Accounts</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-2 py-2">Username</th>
                <th className="px-2 py-2">Display Name</th>
                <th className="px-2 py-2">Role</th>
                <th className="px-2 py-2">Regions</th>
                <th className="px-2 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {editableUsers.map((user) => (
                <tr key={user.username} className="border-b border-zinc-100">
                  <td className="px-2 py-2">{user.username}</td>
                  <td className="px-2 py-2">{user.displayName}</td>
                  <td className="px-2 py-2">
                    <select
                      value={user.role}
                      disabled={user.username === "david"}
                      onChange={(event) =>
                        updateDraftRole(user.username, event.target.value as UserRole)
                      }
                      className="rounded-lg border border-zinc-300 px-2 py-1"
                    >
                      <option value="regional_admin">regional_admin</option>
                      <option value="super_admin">super_admin</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      {ALL_REGIONS.map((region) => (
                        <label key={`${user.username}-${region}`} className="inline-flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={user.regions.includes(region)}
                            disabled={user.username === "david"}
                            onChange={() => updateDraftRegions(user.username, region)}
                          />
                          {region}
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateUser(user)}
                        className="rounded-lg border border-zinc-300 px-2 py-1 hover:bg-zinc-50"
                      >
                        Save / Reset PW
                      </button>
                      <button
                        type="button"
                        disabled={user.username === "david"}
                        onClick={() => deleteUser(user.username)}
                        className="rounded-lg border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {message ? (
        <p className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700">
          {message}
        </p>
      ) : null}
    </div>
  );
}
