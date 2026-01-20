import type { ReactNode } from "react";
import Link from "next/link";
import AuthStatus from "./components/AuthStatus";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <Link
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-lg font-semibold text-white"
            href="/"
          >
            M
          </Link>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted">
              MINDS Connect
            </p>
            <p className="font-display text-lg text-[color:var(--accent-3)]">
              App Console
            </p>
          </div>
        </div>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-[color:var(--accent-3)] md:flex">
          <Link href="/student">Student</Link>
          <Link href="/caregiver">Caregiver</Link>
          <Link href="/staff">Staff</Link>
          <Link href="/auth">Auth</Link>
        </nav>
        <AuthStatus />
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 pb-20">{children}</main>
    </div>
  );
}
