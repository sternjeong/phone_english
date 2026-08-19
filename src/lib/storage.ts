"use client";

import { CallSession, Persona, Report } from "./types";

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

export const storage = {
  getPersona: () => getJSON<Persona | null>("/api/data/persona"),
  setPersona: (p: Persona) => putJSON("/api/data/persona", p),

  getSessions: () => getJSON<CallSession[]>("/api/data/sessions"),
  saveSession: (session: CallSession) => postJSON("/api/data/sessions", session),

  getReports: () => getJSON<Report[]>("/api/data/reports"),
  getReport: (id: string) => getJSON<Report | null>(`/api/data/reports/${id}`),
  saveReport: (report: Report) => postJSON("/api/data/reports", report),

  getWordStreak: () => getJSON<Record<string, number>>("/api/data/streak"),
  addWords: (count: number, date = new Date().toISOString().slice(0, 10)) =>
    postJSON("/api/data/streak", { words: count, date }),
};
