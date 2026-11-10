"use client";

import { CallSession, Persona, Report, VocabularyItem } from "./types";

/**
 * Server-backed persistence (Postgres via /api/data/**, scoped to the
 * signed-in user) — replaces the earlier localStorage-only MVP now that the
 * app has accounts. Same function names/shapes as before, but every call is
 * now a network request, so callers need a loading state (see
 * src/lib/useAsync.ts for the shared hook pattern).
 */

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `${url} failed (${res.status})`);
  }
  return res.json();
}

async function postJSON(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `${url} failed (${res.status})`);
  }
}

async function putJSON(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `${url} failed (${res.status})`);
  }
}

async function deleteJSON(url: string): Promise<void> {
  const res = await fetch(url, { method: "DELETE" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `${url} failed (${res.status})`);
  }
}

/**
 * YYYY-MM-DD in the browser's local timezone. `toISOString()` is UTC, which
 * filed any call made before 09:00 KST under the previous day — and the
 * stats calendar reads keys back in local time.
 */
function localDateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const storage = {
  getPersona: () => getJSON<Persona | null>("/api/data/persona"),
  setPersona: (p: Persona) => putJSON("/api/data/persona", p),

  getSessions: () => getJSON<CallSession[]>("/api/data/sessions"),
  getSession: (id: string) => getJSON<CallSession | null>(`/api/data/sessions/${id}`),
  saveSession: (session: CallSession) => postJSON("/api/data/sessions", session),

  getReports: () => getJSON<Report[]>("/api/data/reports"),
  getReport: (id: string) => getJSON<Report | null>(`/api/data/reports/${id}`),
  saveReport: (report: Report) => postJSON("/api/data/reports", report),
  deleteReport: (id: string) => deleteJSON(`/api/data/reports/${id}`),

  getWordStreak: () => getJSON<Record<string, number>>("/api/data/streak"),
  addWords: (count: number, date = localDateKey()) =>
    postJSON("/api/data/streak", { words: count, date }),

  getVocabulary: () => getJSON<VocabularyItem[]>("/api/data/vocabulary"),
  saveVocabulary: (items: VocabularyItem[]) => postJSON("/api/data/vocabulary", { items }),
  updateVocabulary: (item: VocabularyItem) => putJSON(`/api/data/vocabulary/${item.id}`, item),
  deleteVocabulary: (id: string) => deleteJSON(`/api/data/vocabulary/${id}`),
};
