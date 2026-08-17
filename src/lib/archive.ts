"use client";

import type { Expression } from "@/lib/types";

/**
 * localStorage-backed "보관" (archive) helpers — bookmarked expressions and
 * bookmarked transcript sentences. Deliberately separate from
 * src/lib/storage.ts (out of scope for this pass); own key, own shape.
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

const KEY = "pe_archive";

type ArchiveData = {
  expressions: BookmarkedExpression[];
  sentences: BookmarkedSentence[];
};

function read(): ArchiveData {
  if (typeof window === "undefined") return { expressions: [], sentences: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { expressions: [], sentences: [] };
    const parsed = JSON.parse(raw) as Partial<ArchiveData>;
    return {
      expressions: Array.isArray(parsed.expressions) ? parsed.expressions : [],
      sentences: Array.isArray(parsed.sentences) ? parsed.sentences : [],
    };
  } catch {
    return { expressions: [], sentences: [] };
  }
}

function write(data: ArchiveData) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export const archive = {
  getExpressions(): BookmarkedExpression[] {
    return read().expressions;
  },

  getSentences(): BookmarkedSentence[] {
    return read().sentences;
  },

  isExpressionBookmarked(expressionId: string): boolean {
    return read().expressions.some((e) => e.id === expressionId);
  },

  isSentenceBookmarked(sentenceId: string): boolean {
    return read().sentences.some((s) => s.id === sentenceId);
  },

  toggleExpression(expression: Expression, reportId: string): boolean {
    const data = read();
    const exists = data.expressions.some((e) => e.id === expression.id);
    if (exists) {
      data.expressions = data.expressions.filter((e) => e.id !== expression.id);
    } else {
      data.expressions = [
        { ...expression, reportId, bookmarkedAt: Date.now() },
        ...data.expressions,
      ];
    }
    write(data);
    return !exists;
  },

  toggleSentence(sentence: Omit<BookmarkedSentence, "bookmarkedAt">): boolean {
    const data = read();
    const exists = data.sentences.some((s) => s.id === sentence.id);
    if (exists) {
      data.sentences = data.sentences.filter((s) => s.id !== sentence.id);
    } else {
      data.sentences = [{ ...sentence, bookmarkedAt: Date.now() }, ...data.sentences];
    }
    write(data);
    return !exists;
  },
};
