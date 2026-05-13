"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { REGIONS } from "@/lib/accounts";
import { isAdminProtectedUsername } from "@/lib/admin-protected-usernames";
import { toast } from "@/lib/app-toast";
import { Language } from "@/lib/i18n";
import { AdminAuditLog, AdminUser, Region, UserRole } from "@/lib/types";

function formatAuditLogTime(iso: string, language: Language): string {
  return new Date(iso).toLocaleString(language === "en" ? "en-US" : "zh-CN", {
    dateStyle: "short",
    timeStyle: "short",
    hour12: language === "en",
  });
}

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
    updateFailed: language === "en" ? "Update failed." : "更新失败。",
    updated: language === "en" ? "Updated {username}." : "已更新 {username}。",
    deleteFailed: language === "en" ? "Delete failed." : "删除失败。",
    deleted: language === "en" ? "Deleted {username}." : "已删除 {username}。",
    batchFailed: language === "en" ? "Batch import failed" : "批量导入失败",
    batchOk: language === "en" ? "Batch import finished" : "批量导入完成",
    saveModalTitle: language === "en" ? "Save account changes" : "保存账号变更",
    saveModalHint:
      language === "en"
        ? "Applies role and regions for this row. Optionally set a new password (min 6 characters); leave blank to keep the current password."
        : "保存本行的角色与区域。可选填写新密码（至少 6 位）；留空则不修改密码。",
    newPasswordOptional: language === "en" ? "New password (optional)" : "新密码（可选）",
    cancel: language === "en" ? "Cancel" : "取消",
    save: language === "en" ? "Save" : "保存",
    saving: language === "en" ? "Saving…" : "保存中…",
    deleteModalTitle: language === "en" ? "Delete account" : "删除账号",
    deleteModalBody:
      language === "en"
        ? "This will permanently remove {username}. This cannot be undone."
        : "将永久删除用户 {username}，且无法恢复。",
    confirmDelete: language === "en" ? "Delete account" : "确认删除",
    deleting: language === "en" ? "Deleting…" : "删除中…",
  };

  const [editableUsers, setEditableUsers] = useState<AdminUser[]>(users);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("regional_admin");
  const [regions, setRegions] = useState<Region[]>([REGIONS[0]]);
  const [loading, setLoading] = useState(false);
  const [savingUsername, setSavingUsername] = useState<string | null>(null);
  const [deletingUsername, setDeletingUsername] = useState<string | null>(null);
  const [saveModalUser, setSaveModalUser] = useState<AdminUser | null>(null);
  const [saveModalPassword, setSaveModalPassword] = useState("");
  const [deleteModalUsername, setDeleteModalUsername] = useState<string | null>(null);
  const [batchSummary, setBatchSummary] = useState<string | null>(null);
  const [batchErrors, setBatchErrors] = useState<{ row: number; message: string }[]>([]);
  const batchFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditableUsers(users);
  }, [users]);

  useEffect(() => {
    if (!saveModalUser && !deleteModalUsername) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (savingUsername || deletingUsername) return;
      setSaveModalUser(null);
      setSaveModalPassword("");
      setDeleteModalUsername(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveModalUser, deleteModalUsername, savingUsername, deletingUsername]);

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
      toast.error(data.message || t.batchFailed);
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
    toast.success(t.batchOk);
    router.refresh();
  }

  async function createUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
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
      toast.error(t.createFailed);
      return;
    }

    toast.success(t.userCreated);
    setUsername("");
    setDisplayName("");
    setPassword("");
    setRole("regional_admin");
    setRegions([REGIONS[0]]);
    router.refresh();
  }

  function openSaveModal(user: AdminUser) {
    setSaveModalPassword("");
    setSaveModalUser(user);
  }

  async function commitSaveModal() {
    if (!saveModalUser) return;
    const pw = saveModalPassword.trim();
    if (pw && pw.length < 6) {
      toast.error(language === "en" ? "Password must be at least 6 characters." : "密码至少 6 位。");
      return;
    }
    setSavingUsername(saveModalUser.username);
    const response = await fetch(`/api/admin/users/${encodeURIComponent(saveModalUser.username)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: saveModalUser.role,
        regions: saveModalUser.regions,
        password: pw || undefined,
      }),
    });
    setSavingUsername(null);

    if (!response.ok) {
      toast.error(t.updateFailed);
      return;
    }

    const savedName = saveModalUser.username;
    setSaveModalUser(null);
    setSaveModalPassword("");
    toast.success(t.updated.replace("{username}", savedName));
    router.refresh();
  }

  function openDeleteModal(usernameToDelete: string) {
    setDeleteModalUsername(usernameToDelete);
  }

  async function commitDeleteModal() {
    if (!deleteModalUsername) return;
    setDeletingUsername(deleteModalUsername);
    const response = await fetch(`/api/admin/users/${encodeURIComponent(deleteModalUsername)}`, {
      method: "DELETE",
    });
    setDeletingUsername(null);

    if (!response.ok) {
      toast.error(t.deleteFailed);
      return;
    }

    const u = deleteModalUsername;
    setDeleteModalUsername(null);
    toast.success(t.deleted.replace("{username}", u));
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

  const modalBusy = Boolean(savingUsername || deletingUsername);

  return (
    <div className="space-y-4">
      <section className="app-card p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <h3 className="text-lg font-semibold text-foreground">{t.createTitle}</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/api/admin/users/csv-template"
              prefetch={false}
              className="app-button-secondary inline-flex px-3 py-1.5 text-sm"
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
              className="app-button-secondary inline-flex px-3 py-1.5 text-sm disabled:opacity-60"
            >
              {t.batchImport}
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-app-muted">{t.batchHint}</p>
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
        <form className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" onSubmit={createUser}>
          <input
            className="min-w-0 rounded-lg px-3 py-2"
            placeholder={t.username}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
          <input
            className="min-w-0 rounded-lg px-3 py-2"
            placeholder={t.displayName}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
          <input
            className="min-w-0 rounded-lg px-3 py-2"
            placeholder={t.initialPassword}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
          />
          <select
            className="min-w-0 rounded-lg px-3 py-2"
            value={role}
            aria-label={t.role}
            onChange={(event) => setRole(event.target.value as UserRole)}
          >
            <option value="regional_admin">regional_admin</option>
            <option value="super_admin">super_admin</option>
          </select>

          <div className="flex min-w-0 flex-wrap gap-2 sm:col-span-2 lg:col-span-3 xl:col-span-4">
            {REGIONS.map((region) => (
              <label
                key={region}
                className="inline-flex min-w-0 items-center gap-2 rounded-lg border border-app-border bg-white px-3 py-1.5 text-sm"
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

          <div className="min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-4">
            <button
              type="submit"
              disabled={loading}
              className="app-button-primary px-4 py-2 text-sm disabled:opacity-60"
            >
              {loading ? t.creating : t.createUser}
            </button>
          </div>
        </form>
      </section>

      <section className="app-card p-5">
        <h3 className="text-lg font-semibold text-foreground">{t.existingAccounts}</h3>
        <div className="app-table-shell mt-3 overflow-x-auto">
          <table className="app-table min-w-[860px]">
            <thead>
              <tr>
                <th>{t.username}</th>
                <th>{t.displayName}</th>
                <th>{t.role}</th>
                <th>{t.regions}</th>
                <th>{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {editableUsers.map((user) => {
                const rowBusy = savingUsername === user.username || deletingUsername === user.username;
                const protectedUser = isAdminProtectedUsername(user.username);
                return (
                  <tr key={user.username}>
                    <td>{user.username}</td>
                    <td>{user.displayName}</td>
                    <td>
                      <select
                        value={user.role}
                        aria-label={`${t.role} · ${user.username}`}
                        disabled={protectedUser || rowBusy}
                        onChange={(event) =>
                          updateDraftRole(user.username, event.target.value as UserRole)
                        }
                        className="rounded-lg px-2 py-1"
                      >
                        <option value="regional_admin">regional_admin</option>
                        <option value="super_admin">super_admin</option>
                      </select>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        {REGIONS.map((region) => (
                          <label key={`${user.username}-${region}`} className="inline-flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={user.regions.includes(region)}
                              disabled={protectedUser || rowBusy}
                              onChange={() => updateDraftRegions(user.username, region)}
                            />
                            {region}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={rowBusy}
                          onClick={() => openSaveModal(user)}
                          className="app-button-secondary px-2 py-1 text-sm disabled:opacity-60"
                        >
                          {t.saveResetPw}
                        </button>
                        <button
                          type="button"
                          disabled={protectedUser || rowBusy}
                          onClick={() => openDeleteModal(user.username)}
                          className="rounded-lg border border-red-200 px-2 py-1 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {t.delete}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="app-card p-5">
        <h3 className="text-lg font-semibold text-foreground">{t.operationLogs}</h3>
        <p className="mt-1 text-sm text-[#4B5563]">{t.operationLogsDesc}</p>
        <div className="app-table-shell mt-3 overflow-x-auto">
          <table className="app-table min-w-[860px]">
            <thead>
              <tr>
                <th>{t.time}</th>
                <th>{t.actor}</th>
                <th>{t.action}</th>
                <th>{t.targetUser}</th>
                <th>{t.details}</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-app-muted">
                    {t.noLogs}
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="whitespace-nowrap tabular-nums">{formatAuditLogTime(log.createdAt, language)}</td>
                    <td>{log.actorUsername}</td>
                    <td>{log.action}</td>
                    <td>{log.targetUsername}</td>
                    <td>{log.details || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {saveModalUser ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-16 sm:pt-24"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-user-modal-title"
        >
          <div
            className="absolute inset-0"
            aria-hidden
            onClick={() => {
              if (!modalBusy) {
                setSaveModalUser(null);
                setSaveModalPassword("");
              }
            }}
          />
          <div className="relative w-full max-w-md rounded-xl border border-app-border bg-white p-5 shadow-[0_16px_48px_rgba(17,24,39,0.12)]">
            <h4 id="save-user-modal-title" className="text-base font-semibold text-[#111827]">
              {t.saveModalTitle}
            </h4>
            <p className="mt-1 text-sm text-[#4B5563]">
              <span className="font-medium text-[#111827]">{saveModalUser.username}</span>
              {" · "}
              {saveModalUser.displayName}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[#6B7280]">{t.saveModalHint}</p>
            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-[#4B5563]">{t.newPasswordOptional}</span>
              <input
                type="password"
                autoComplete="new-password"
                aria-label={t.newPasswordOptional}
                className="w-full rounded-lg border border-app-border px-3 py-2 text-sm"
                value={saveModalPassword}
                onChange={(e) => setSaveModalPassword(e.target.value)}
                placeholder="······"
              />
            </label>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={modalBusy}
                className="app-button-secondary px-3 py-2 text-sm disabled:opacity-60"
                onClick={() => {
                  setSaveModalUser(null);
                  setSaveModalPassword("");
                }}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={modalBusy}
                className="app-button-primary px-3 py-2 text-sm disabled:opacity-60"
                onClick={() => void commitSaveModal()}
              >
                {savingUsername ? t.saving : t.save}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalUsername ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-16 sm:pt-24"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-user-modal-title"
        >
          <div
            className="absolute inset-0"
            aria-hidden
            onClick={() => {
              if (!modalBusy) setDeleteModalUsername(null);
            }}
          />
          <div className="relative w-full max-w-md rounded-xl border border-app-border bg-white p-5 shadow-[0_16px_48px_rgba(17,24,39,0.12)]">
            <h4 id="delete-user-modal-title" className="text-base font-semibold text-red-800">
              {t.deleteModalTitle}
            </h4>
            <p className="mt-3 text-sm text-[#374151]">
              {t.deleteModalBody.replace("{username}", deleteModalUsername)}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={modalBusy}
                className="app-button-secondary px-3 py-2 text-sm disabled:opacity-60"
                onClick={() => setDeleteModalUsername(null)}
              >
                {t.cancel}
              </button>
              <button
                type="button"
                disabled={modalBusy}
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-60"
                onClick={() => void commitDeleteModal()}
              >
                {deletingUsername ? t.deleting : t.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
