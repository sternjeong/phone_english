/**
 * Shared domain types. Source of truth for feature scope/behavior is
 * docs/PROJECT_NOTES.md — keep this file in sync with decisions made there.
 */

export type Persona = {
  id: string;
  name: string;
  personality: string;
  interests: string[];
};

export type ParaphraseStatus = "pending" | "approved" | "corrected";

export type Paraphrase = {
  status: ParaphraseStatus;
  corrected?: string;
  reason?: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "ai";
  textEn: string;
  textKo?: string;
  paraphrase?: Paraphrase;
  createdAt: number;
};

export type Topic = "me" | "career" | "relationships" | "emotions";

export type CallSession = {
  id: string;
  personaId: string;
  topic: Topic;
  startedAt: number;
  endedAt?: number;
  messages: ChatMessage[];
};

export type Expression = {
  id: string;
  phrase: string;
  meaningKo: string;
  exampleEn: string;
  exampleKo: string;
  highlight: string; // substring of exampleEn to highlight, mirrors the app's green-highlighted key phrase
};

export type WordScore = {
  word: string;
  grade: "good" | "ok" | "poor"; // maps to green / yellow / red
};

export type PracticeAttempt = {
  expressionId: string;
  overall: number; // 0-100
  pronunciation: number;
  prosody: number;
  fluency: number;
  wordScores: WordScore[];
};

export type Report = {
  id: string;
  callSessionId: string;
  title: string; // AI-generated topic title, e.g. "군대 동기와의 솔직한 대화"
  createdAt: number;
  wordCount: number;
  reviewed: boolean;
  pronunciation?: number;
  prosody?: number;
  fluency?: number;
  expressions: Expression[];
};
