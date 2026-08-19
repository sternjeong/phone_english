"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";

/**
 * Small avatar button (replaces the old static 🙂 placeholder) — click to
 * reveal a sign-out link. Single-user passcode login (src/lib/auth.ts) has
 * no name/email/image to show, just a fixed "Me".
 */
export function UserMenu() {
  const [open, setOpen] = useState(false);
  useSession(); // keeps the session live-refreshed for signOut() below

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="계정"
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-ink-700 bg-ink-800 text-xs text-ink-400"
      >
        🙂
      </button>
      {open && (
        <div className="absolute right-0 top-10 z-10 w-40 rounded-xl border border-ink-700 bg-ink-900 p-3 text-left shadow-xl">
          <p className="mb-3 truncate text-sm font-medium text-ink-100">로그인됨</p>
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
