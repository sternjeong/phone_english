"use client";

import Link from "next/link";
import { useState } from "react";
import { PhoneShell } from "@/components/ui/PhoneShell";
import { useClientValue } from "@/lib/useClientValue";

/**
 * SCREEN 02 — schedule. Cosmetic only: the product decision is an on-demand
 * call trigger, not a real scheduler (see docs/PROJECT_NOTES.md decisions).
 * We just persist a preferred time locally for show.
 */

const SCHEDULE_KEY = "pe_preferred_time";

function getPreferredTime(): string {
  if (typeof window === "undefined") return "19:00";
  return window.localStorage.getItem(SCHEDULE_KEY) ?? "19:00";
}

function setPreferredTime(time: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SCHEDULE_KEY, time);
}

function formatKoreanTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  const period = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}:${String(m).padStart(2, "0")}`;
}

export default function SchedulePage() {
  const storedTime = useClientValue(getPreferredTime, "19:00");
  const [override, setOverride] = useState<string | null>(null);
  const time = override ?? storedTime;
  const [editing, setEditing] = useState(false);

  function handleSave(newTime: string) {
    setOverride(newTime);
    setPreferredTime(newTime);
    setEditing(false);
  }

  return (
    <PhoneShell tone="ink">
      <div className="flex flex-1 flex-col px-6 py-6">
        <div className="mb-8 flex items-center">
          <Link
            href="/"
            aria-label="뒤로가기"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-100 transition hover:bg-ink-800"
          >
            ←
          </Link>
        </div>

        <p className="mb-2 text-sm text-ink-400">오늘 일정</p>
        <div className="mb-10 flex items-center gap-2">
          <span className="text-4xl font-bold text-ink-100">{formatKoreanTime(time)}</span>
          <span className="text-mint-500">✓</span>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-medium text-ink-100">반복 일정</p>
          <button
            onClick={() => setEditing((v) => !v)}
            className="text-sm text-mint-500 transition hover:text-mint-600"
          >
            {editing ? "완료" : "수정"}
          </button>
        </div>

        <div className="rounded-2xl border border-ink-700 bg-ink-900 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-ink-100">토요일</p>
              <p className="text-xs text-ink-400">매주 반복</p>
            </div>
            {editing ? (
              <input
                type="time"
                value={time}
                onChange={(e) => handleSave(e.target.value)}
                className="rounded-lg border border-ink-700 bg-ink-800 px-3 py-1.5 text-sm text-ink-100 focus:border-mint-500 focus:outline-none"
              />
            ) : (
              <span className="text-sm text-ink-100">{time}</span>
            )}
          </div>
        </div>

        <p className="mt-6 text-xs leading-relaxed text-ink-400">
          지금은 원할 때 바로 &quot;전화 걸기&quot; 버튼을 눌러 통화를 시작할 수 있어요. 반복
          일정은 참고용으로 저장돼요.
        </p>
      </div>
    </PhoneShell>
  );
}
