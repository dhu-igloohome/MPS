"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { toast } from "@/lib/app-toast";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    setLoading(false);
    toast.success("Logged out");
    window.setTimeout(() => {
      router.push("/login");
      router.refresh();
    }, 400);
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      className="app-button-secondary px-3 py-1.5 text-sm disabled:opacity-60"
    >
      {loading ? "..." : "Logout"}
    </button>
  );
}
