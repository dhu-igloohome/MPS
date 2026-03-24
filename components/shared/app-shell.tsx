import Link from "next/link";
import Image from "next/image";

import { LogoutButton } from "@/components/shared/logout-button";
import { SessionPayload } from "@/lib/types";

type AppShellProps = {
  session: SessionPayload;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function AppShell({ session, title, description, children }: AppShellProps) {
  return (
    <main className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="space-y-1">
            <Image src="/igloo-logo-pinge.svg" alt="Igloo logo" width={87} height={24} priority />
            <p className="text-sm text-zinc-500">igloo ForeTracker | igloo订单追踪系统</p>
            <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-zinc-600 sm:inline">
              {session.displayName} ({session.role})
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl gap-4 px-4 py-5 sm:px-6">
        <nav className="hidden w-52 flex-none rounded-2xl border border-zinc-200 bg-white p-3 md:block">
          <ul className="space-y-1 text-sm">
            <li>
              <Link
                href="/dashboard"
                className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
              >
                Cockpit
              </Link>
            </li>
            <li>
              <Link
                href="/forecast"
                className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
              >
                Forecast Input
              </Link>
            </li>
            <li>
              <Link
                href="/order-progress"
                className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
              >
                订单进度
              </Link>
            </li>
            <li>
              <Link
                href="/logistics-progress"
                className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
              >
                物流进度
              </Link>
            </li>
            {session.role === "super_admin" ? (
              <li>
                <Link
                  href="/admin/users"
                  className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
                >
                  User Management
                </Link>
              </li>
            ) : null}
            {session.role === "super_admin" ? (
              <li>
                <Link
                  href="/admin/products"
                  className="block rounded-lg px-3 py-2 text-zinc-700 hover:bg-zinc-100"
                >
                  Product Database
                </Link>
              </li>
            ) : null}
          </ul>
        </nav>

        <section className="min-w-0 flex-1 space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <h2 className="text-xl font-semibold text-zinc-900">{title}</h2>
            <p className="mt-1 text-sm text-zinc-600">{description}</p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
