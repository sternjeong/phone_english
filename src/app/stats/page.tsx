"use client";

import { PhoneShell } from "@/components/ui/PhoneShell";
import { storage } from "@/lib/storage";
import { useAsync } from "@/lib/useAsync";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

/**
 * SCREEN 04 — 발화 기록 (stats). Paper (white) tone like the report list.
 * See docs/PROJECT_NOTES.md "학습 — 발화 기록 화면".
 */
export default function StatsPage() {
  const streakState = useAsync(() => storage.getWordStreak(), []);
  const sessionsState = useAsync(() => storage.getSessions(), []);

  if (streakState.status === "error" || sessionsState.status === "error") {
    return (
      <PhoneShell tone="paper">
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm text-paper-600">불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        </div>
      </PhoneShell>
    );
  }

  const streak = streakState.status === "ready" ? streakState.data : {};
  const sessions = sessionsState.status === "ready" ? sessionsState.data : [];

  const totalWords = Object.values(streak).reduce((sum, n) => sum + n, 0);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const firstOfMonth = new Date(year, month, 1);
  // Monday-first weekday index (0 = Mon ... 6 = Sun)
  const leadingBlank = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const totalMinutes = sessions.reduce((sum, s) => {
    if (s.endedAt) return sum + Math.round((s.endedAt - s.startedAt) / 60000);
    return sum;
  }, 0);

  return (
    <PhoneShell tone="paper">
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-paper-900">발화 기록</h1>

        <div className="mb-2 text-4xl font-bold text-paper-900">🔥 {totalWords} 단어</div>
        <p className="mb-6 text-sm text-paper-600">이번주도 달려볼까요?</p>

        <div className="mb-8 rounded-2xl border border-paper-200 bg-paper-0 p-4">
          <p className="mb-4 text-sm font-semibold text-paper-900">{month + 1}월</p>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] text-paper-600">
            {WEEKDAYS.map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlank }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
                2,
                "0"
              )}`;
              const words = streak?.[dateKey] ?? 0;
              const isToday = day === now.getDate();
              return (
                <div
                  key={day}
                  className="flex flex-col items-center gap-1 py-1"
                  title={`${dateKey}: ${words}단어`}
                >
                  <span
                    className={`text-[10px] ${
                      isToday ? "font-bold text-paper-900" : "text-paper-600"
                    }`}
                  >
                    {day}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${activityDotClass(words)}`}
                    aria-hidden
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-paper-200 bg-paper-0 p-4 text-center">
            <p className="text-xl font-bold text-paper-900">통화 {sessions.length}회</p>
          </div>
          <div className="rounded-2xl border border-paper-200 bg-paper-0 p-4 text-center">
            <p className="text-xl font-bold text-paper-900">학습 {totalMinutes}분</p>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function activityDotClass(words: number) {
  if (words <= 0) return "bg-paper-200";
  if (words < 30) return "bg-mint-500/40";
  if (words < 100) return "bg-mint-500/70";
  return "bg-mint-500";
}
