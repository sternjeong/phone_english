"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

/**
 * Small avatar button (replaces the old static 🙂 placeholder) — click to
 * reveal the signed-in user's name/email and a sign-out link.
 */
export function UserMenu() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const user = session?.user;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="계정"
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-ink-700 bg-ink-800 text-xs text-ink-400"
      >
        {user?.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-full w-full object-cover" />
        ) : (
          "🙂"
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-10 w-48 rounded-xl border border-ink-700 bg-ink-900 p-3 text-left shadow-xl">
          <p className="truncate text-sm font-medium text-ink-100">{user?.name ?? "사용자"}</p>
          <p className="mb-3 truncate text-xs text-ink-400">{user?.email}</p>
          <button
            onClick={() => signOut({ redirectTo: "/sign-in" })}
            className="w-full rounded-full border border-ink-700 py-1.5 text-xs text-ink-100 transition hover:border-coral-400 hover:text-coral-400"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
