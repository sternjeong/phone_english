"use client";

import Link from "next/link";
import { PhoneShell } from "@/components/ui/PhoneShell";
import { Pill } from "@/components/ui/Pill";
import { UserMenu } from "@/components/ui/UserMenu";
import { storage } from "@/lib/storage";
import { useAsync } from "@/lib/useAsync";

/** SCREEN 01 — home. Black background, cursive-ish AI name centered, bottom
 * 3-item bar with a big mint call button. See docs/PROJECT_NOTES.md. */
export default function HomePage() {
  const personaState = useAsync(() => storage.getPersona(), []);
  const streakState = useAsync(() => storage.getWordStreak(), []);

  const persona = personaState.status === "ready" ? personaState.data : null;
  const totalWords =
    streakState.status === "ready"
      ? Object.values(streakState.data).reduce((sum, n) => sum + n, 0)
      : 0;
  const hasError = personaState.status === "error" || streakState.status === "error";

  return (
    <PhoneShell tone="ink">
      {/* top bar */}
      <div className="flex items-center justify-between px-6 pt-6">
        <Link
          href="/schedule"
          className="text-sm font-medium text-ink-400 transition hover:text-ink-100"
        >
          일정
        </Link>
        <div className="flex items-center gap-2">
          <Pill tone="amber">🔥 {totalWords}</Pill>
          <UserMenu />
        </div>
      </div>

      {/* centerpiece */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        {personaState.status === "loading" ? null : hasError ? (
          <p className="text-sm text-ink-400">정보를 불러오지 못했어요</p>
        ) : persona ? (
          <>
            <p className="mb-2 text-sm text-ink-400">오늘도 전화할 준비 됐어?</p>
            <h1
              className="select-none text-6xl font-bold italic tracking-tight text-ink-100"
              style={{ fontFamily: "var(--font-cursive, ui-serif, serif)" }}
            >
              {persona.name}
            </h1>
          </>
        ) : (
          <>
            <h1 className="mb-3 text-4xl font-bold italic tracking-tight text-ink-100">
              전화 영어
            </h1>
            <p className="mb-8 max-w-[26ch] text-sm text-ink-400">
              AI 원어민 친구를 먼저 설정하면 바로 전화를 걸 수 있어요.
            </p>
            <Link
              href="/onboarding"
              className="rounded-full bg-mint-500 px-8 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-600"
            >
              시작하기
            </Link>
          </>
        )}
      </div>

      {/* bottom bar */}
      <div className="flex items-center justify-between px-8 pb-8 pt-4">
        <Link
          href="/schedule"
          className="flex flex-col items-center gap-1 text-ink-400 transition hover:text-ink-100"
        >
          <CalendarIcon />
          <span className="text-[11px]">일정</span>
        </Link>

        {persona ? (
          <Link
            href="/call"
            aria-label="전화 걸기"
            className="-mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-mint-500 text-ink-950 shadow-[0_8px_24px_-4px_rgba(53,214,140,0.6)] transition hover:bg-mint-600 active:scale-95"
          >
            <PhoneIcon />
          </Link>
        ) : (
          <div
            aria-hidden
            className="-mt-8 flex h-20 w-20 items-center justify-center rounded-full bg-ink-800 text-ink-700"
          >
            <PhoneIcon />
          </div>
        )}

        <Link
          href="/stats"
          className="flex flex-col items-center gap-1 text-ink-400 transition hover:text-ink-100"
        >
          <WaveIcon />
          <span className="text-[11px]">학습</span>
        </Link>
      </div>
    </PhoneShell>
  );
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  );
}

function WaveIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M3 12h2l2-7 3 14 3-11 2 4h6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.3 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.5 21 3 13.5 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.3 1.1L6.6 10.8z" />
    </svg>
  );
}
