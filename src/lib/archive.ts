"use client";

import type { Expression } from "@/lib/types";

/**
 * Server-backed "보관" (archive) helpers — bookmarked expressions and
 * bookmarked transcript sentences, via /api/data/archive. Same shapes as
 * the original localStorage version; now async.
 */

export type BookmarkedExpression = Expression & {
  reportId: string;
  bookmarkedAt: number;
};

export type BookmarkedSentence = {
  id: string; // stable id, derived from reportId + messageId
  reportId: string;
  textEn: string;
  textKo?: string;
  bookmarkedAt: number;
};

type ArchiveData = {
  expressions: BookmarkedExpression[];
  sentences: BookmarkedSentence[];
};

async function fetchArchive(): Promise<ArchiveData> {
  const res = await fetch("/api/data/archive");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `archive fetch failed (${res.status})`);
  }
  return res.json();
}

async function toggle(body: unknown): Promise<boolean> {
  const res = await fetch("/api/data/archive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `archive toggle failed (${res.status})`);
  }
  const data = (await res.json()) as { bookmarked: boolean };
  return data.bookmarked;
}

export const archive = {
  async getExpressions(): Promise<BookmarkedExpression[]> {
    return (await fetchArchive()).expressions;
  },

  async getSentences(): Promise<BookmarkedSentence[]> {
    return (await fetchArchive()).sentences;
  },

  toggleExpression(expression: Expression, reportId: string): Promise<boolean> {
    return toggle({ kind: "expression", expression, reportId });
  },

  toggleSentence(sentence: Omit<BookmarkedSentence, "bookmarkedAt">): Promise<boolean> {
    return toggle({ kind: "sentence", sentence });
  },
};
