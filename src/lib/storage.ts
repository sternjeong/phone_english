"use client";

import { CallSession, Persona, Report } from "./types";

/**
 * MVP has no accounts/DB (see docs/PROJECT_NOTES.md decisions) — everything
 * lives in localStorage. Keep this the single place that touches the key
 * names so screens don't drift.
 */
const KEYS = {
  persona: "pe_persona",
  sessions: "pe_sessions",
  reports: "pe_reports",
  wordStreak: "pe_word_streak", // { [yyyy-mm-dd]: wordsSpoken }
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  getPersona: () => read<Persona | null>(KEYS.persona, null),
  setPersona: (p: Persona) => write(KEYS.persona, p),

  getSessions: () => read<CallSession[]>(KEYS.sessions, []),
  saveSession: (session: CallSession) => {
    const sessions = storage.getSessions().filter((s) => s.id !== session.id);
    sessions.unshift(session);
    write(KEYS.sessions, sessions);
  },

  getReports: () => read<Report[]>(KEYS.reports, []),
  getReport: (id: string) => storage.getReports().find((r) => r.id === id) ?? null,
  saveReport: (report: Report) => {
    const reports = storage.getReports().filter((r) => r.id !== report.id);
    reports.unshift(report);
    write(KEYS.reports, reports);
  },

  getWordStreak: () => read<Record<string, number>>(KEYS.wordStreak, {}),
  addWords: (count: number, date = new Date().toISOString().slice(0, 10)) => {
    const streak = storage.getWordStreak();
    streak[date] = (streak[date] ?? 0) + count;
    write(KEYS.wordStreak, streak);
    return streak;
  },
};
