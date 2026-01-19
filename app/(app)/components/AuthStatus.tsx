"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearSession, getSession } from "@/app/lib/api";
import { useRouter } from "next/navigation";

type StoredUser = {
  name: string;
  role: string;
};

export default function AuthStatus() {
  const [user, setUser] = useState<StoredUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    const syncUser = () => {
      const session = getSession();
      setUser(session?.user ? { name: session.user.name, role: session.user.role } : null);
    };

    syncUser();
    window.addEventListener("storage", syncUser);
    return () => window.removeEventListener("storage", syncUser);
  }, []);

  if (!user) {
    return (
      <Link className="text-sm font-semibold text-[color:var(--accent-3)]" href="/auth">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-muted">
      <span>
        {user.name} ({user.role})
      </span>
      <button
        className="rounded-full border border-black/10 px-3 py-1 text-xs font-semibold text-[color:var(--accent-3)]"
        onClick={() => {
          clearSession();
          setUser(null);
          router.push("/auth");
        }}
        type="button"
      >
        Sign out
      </button>
    </div>
  );
}
