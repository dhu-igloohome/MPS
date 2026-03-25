"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Language } from "@/lib/i18n";
import { AdminAuditLog, AdminUser, Region, UserRole } from "@/lib/types";

const ALL_REGIONS: Region[] = ["APAC", "EU", "USA"];

type UserManagementProps = {
  users: AdminUser[];
  auditLogs: AdminAuditLog[];
  language: Language;
};

export function UserManagement({ users, auditLogs, language }: UserManagementProps) {
  const router = useRouter();
  const t = {
    createTitle: language === "en" ? "Create Office Account" : "创建办公室账号",
    username: language === "en" ? "Username" : "用户名",
    displayName: language === "en" ? "Display Name" : "显示名称",
    initialPassword: language === "en" ? "Initial Password (>= 6 chars)" : "初始密码（>= 6 位）",
    creating: language === "en" ? "Creating..." : "创建中...",
    createUser: language === "en" ? "Create User" : "创建用户",
    batchImport: language === "en" ? "Batch import (CSV)" : "CSV 批量导入",
    downloadTemplate: language === "en" ? "Download CSV template" : "下载 CSV 模板",
    batchHint: language === "en"
      ? "Up to 100 rows. regions: e.g. APAC|EU or APAC,USA. Password ≥ 6 chars. Username: letters, digits, . _ - only."
      : "最多 100 行。regions 列示例：APAC|EU 或 APAC,USA。密码至少 6 位。用户名仅限字母、数字、. _ -。",
    existingAccounts: language === "en" ? "Existing Accounts" : "已有账号",
    role: language === "en" ? "Role" : "角色",
    regions: language === "en" ? "Regions" : "区域",
    actions: language === "en" ? "Actions" : "操作",
    saveResetPw: language === "en" ? "Save / Reset PW" : "保存 / 重置密码",
    delete: language === "en" ? "Delete" : "删除",
    operationLogs: language === "en" ? "Operation Logs" : "操作日志",
    operationLogsDesc:
      language === "en"
        ? "Recent account management operations by super administrators."
        : "超级管理员最近的账号管理操作记录。",
    time: language === "en" ? "Time" : "时间",
    actor: language === "en" ? "Actor" : "操作者",
    action: language === "en" ? "Action" : "动作",
    targetUser: language === "en" ? "Target User" : "目标用户",
    details: language === "en" ? "Details" : "详情",
    noLogs: language === "en" ? "No logs yet." : "暂无日志。",
    createFailed:
      language === "en"
        ? "Create failed. Check username uniqueness and input fields."
        : "创建失败，请检查用户名唯一性和输入字段。",
    userCreated: language === "en" ? "User created." : "用户已创建。",
    resetPrompt:
      language === "en"
        ? "Reset password for {username} (leave blank to skip):"
        : "重置 {username} 的密码（留空则跳过）：",
    updateFailed: language === "en" ? "Update failed." : "更新失败。",
    updated: language === "en" ? "Updated {username}." : "已更新 {username}。",
    deleteConfirm: language === "en" ? "Delete user {username}?" : "确认删除用户 {username}？",
    deleteFailed: language === "en" ? "Delete failed." : "删除失败。",
    deleted: language === "en" ? "Deleted {username}." : "已删除 {username}。",
  };
  const [editableUsers, setEditableUsers] = useState<AdminUser[]>(users);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("regional_admin");
  const [regions, setRegions] = useState<Region[]>(["APAC"]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [batchErrors, setBatchErrors] = useState<{ row: number; message: string }[]>([]);
  const batchFileRef = useRef<HTMLInputElement>(null);

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

  async function onBatchFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setLoading(true);
    setMessage("");
    setBatchSummary(null);
    setBatchErrors([]);
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/admin/users/batch", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      created?: number;
      failed?: number;
      errors?: { row: number; message: string }[];
    };
    setLoading(false);
    if (!response.ok) {
      setMessage(data.message || "Batch import failed");
      return;
    }
    const created = data.created ?? 0;
    const failed = data.failed ?? 0;
    setBatchSummary(
      language === "en"
        ? `Created ${created} user(s). ${failed} row(s) skipped or failed.`
        : `已创建 ${created} 个用户；${failed} 行跳过或失败。`,
    );
    setBatchErrors(Array.isArray(data.errors) ? data.errors.slice(0, 30) : []);
    router.refresh();
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setBatchSummary(null);
    setBatchErrors([]);

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
      setMessage(t.createFailed);
      return;
    }

    setMessage(t.userCreated);
    setUsername("");
    setDisplayName("");
    setPassword("");
    setRole("regional_admin");
    setRegions(["APAC"]);
    router.refresh();
  }

  async function updateUser(user: AdminUser) {
    const newPassword = window.prompt(
      t.resetPrompt.replace("{username}", user.username),
      "",
    );
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
      setMessage(t.updateFailed);
      return;
    }

    setMessage(t.updated.replace("{username}", user.username));
    router.refresh();
  }

  async function deleteUser(usernameToDelete: string) {
    if (!window.confirm(t.deleteConfirm.replace("{username}", usernameToDelete))) {
      return;
    }

    const response = await fetch(`/api/admin/users/${encodeURIComponent(usernameToDelete)}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      setMessage(t.deleteFailed);
      return;
    }

    setMessage(t.deleted.replace("{username}", usernameToDelete));
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">{t.createTitle}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/api/admin/users/csv-template"
              prefetch={false}
              className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              {t.downloadTemplate}
            </Link>
            <input
              ref={batchFileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onBatchFileChange}
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => batchFileRef.current?.click()}
              className="inline-flex rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
            >
              {t.batchImport}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-zinc-500">{t.batchHint}</p>
        {batchSummary ? (
          <p className="mt-2 text-sm text-emerald-800">{batchSummary}</p>
        ) : null}
        {batchErrors.length > 0 ? (
          <ul className="mt-2 max-h-48 list-inside list-disc overflow-y-auto text-sm text-red-700">
            {batchErrors.map((err) => (
              <li key={`${err.row}-${err.message}`}>
                {language === "en" ? "Row" : "第"}
                {err.row}
                {language === "en" ? ": " : " 行："}
                {err.message}
              </li>
            ))}
          </ul>
        ) : null}
        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={createUser}>
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder={t.username}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder={t.displayName}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2"
            placeholder={t.initialPassword}
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
              {loading ? t.creating : t.createUser}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-zinc-900">{t.existingAccounts}</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-2 py-2">{t.username}</th>
                <th className="px-2 py-2">{t.displayName}</th>
                <th className="px-2 py-2">{t.role}</th>
                <th className="px-2 py-2">{t.regions}</th>
                <th className="px-2 py-2">{t.actions}</th>
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
                        {t.saveResetPw}
                      </button>
                      <button
                        type="button"
                        disabled={user.username === "david"}
                        onClick={() => deleteUser(user.username)}
                        className="rounded-lg border border-red-300 px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {t.delete}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5">
        <h3 className="text-lg font-semibold text-zinc-900">{t.operationLogs}</h3>
        <p className="mt-1 text-sm text-zinc-600">
          {t.operationLogsDesc}
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-zinc-600">
                <th className="px-2 py-2">{t.time}</th>
                <th className="px-2 py-2">{t.actor}</th>
                <th className="px-2 py-2">{t.action}</th>
                <th className="px-2 py-2">{t.targetUser}</th>
                <th className="px-2 py-2">{t.details}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-zinc-500">
                    {t.noLogs}
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-zinc-100">
                    <td className="px-2 py-2">
                      {new Date(log.createdAt).toLocaleString("en-US", { hour12: false })}
                    </td>
                    <td className="px-2 py-2">{log.actorUsername}</td>
                    <td className="px-2 py-2">{log.action}</td>
                    <td className="px-2 py-2">{log.targetUsername}</td>
                    <td className="px-2 py-2">{log.details || "-"}</td>
                  </tr>
                ))
              )}
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
