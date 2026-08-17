"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PhoneShell } from "@/components/ui/PhoneShell";
import { Pill } from "@/components/ui/Pill";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { storage } from "@/lib/storage";
import { archive } from "@/lib/archive";
import { useClientValue } from "@/lib/useClientValue";
import type { ChatMessage, Report } from "@/lib/types";

/**
 * SCREEN 10 — report detail. Ink (black) tone per the real screenshots
 * (unlike the report list, which is white). See docs/PROJECT_NOTES.md.
 */
export default function ReportDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const storedReport = useClientValue<Report | null>(
    () => storage.getReport(params.id),
    null
  );
  // A local override lets "복습하기" update the screen immediately without
  // waiting on another storage read (localStorage has no change events).
  const [override, setOverride] = useState<Report | null>(null);
  const report = override ?? storedReport;

  const session = useClientValue(
    () => (report ? storage.getSessions().find((s) => s.id === report.callSessionId) ?? null : null),
    null
  );
  const [exprIndex, setExprIndex] = useState(0);

  function handleReview() {
    if (!report) return;
    const reviewed: Report = {
      ...report,
      reviewed: true,
      pronunciation: report.pronunciation ?? randomScore(),
      prosody: report.prosody ?? randomScore(),
      fluency: report.fluency ?? randomScore(),
    };
    storage.saveReport(reviewed);
    setOverride(reviewed);
  }

  if (report === null) {
    return (
      <PhoneShell tone="ink">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-ink-100">리포트를 찾을 수 없어요</p>
          <Link href="/reports" className="text-sm text-mint-500 underline">
            리포트 목록으로
          </Link>
        </div>
      </PhoneShell>
    );
  }

  const overall =
    report.reviewed && report.pronunciation != null && report.prosody != null && report.fluency != null
      ? Math.round((report.pronunciation + report.prosody + report.fluency) / 3)
      : undefined;

  const expr = report.expressions[exprIndex];

  return (
    <PhoneShell tone="ink">
      <div className="flex flex-1 flex-col overflow-y-auto">
        <CountdownBanner />

        <div className="flex items-center justify-between px-6 pt-4">
          <button
            onClick={() => router.back()}
            className="text-ink-400 transition hover:text-ink-100"
            aria-label="뒤로가기"
          >
            ←
          </button>
          <span className="text-ink-400">···</span>
        </div>

        <div className="px-6 pb-6 pt-4">
          <h1 className="mb-1 text-xl font-bold text-ink-100">{report.title}</h1>
          <p className="mb-4 text-xs text-ink-400">{formatDate(report.createdAt)}</p>

          <div className="mb-6 flex gap-2">
            <Pill tone="amber">🔥 {report.wordCount}</Pill>
            <Pill tone="mint">나의 유창성</Pill>
          </div>

          <div className="mb-6 flex flex-col items-center rounded-3xl border border-ink-800 bg-ink-900 py-6">
            <ScoreGauge value={overall} label={report.reviewed ? "종합 점수" : "아직 복습을 안했어요"} />
          </div>

          <div className="mb-6 grid grid-cols-3 gap-2">
            <StatCard label="발음" value={report.reviewed ? report.pronunciation : undefined} />
            <StatCard label="운율" value={report.reviewed ? report.prosody : undefined} />
            <StatCard label="유창" value={report.reviewed ? report.fluency : undefined} />
          </div>

          {!report.reviewed && (
            <button
              onClick={handleReview}
              className="mb-8 w-full rounded-full bg-ink-100 py-4 text-sm font-semibold text-ink-950 transition hover:bg-white"
            >
              복습하기
            </button>
          )}

          {report.expressions.length > 0 && (
            <div className="mb-8">
              <h2 className="mb-3 text-sm font-semibold text-ink-100">✨ 내게 딱 맞는 원어민 표현</h2>
              <ExpressionCard
                reportId={report.id}
                expression={expr}
                index={exprIndex}
                total={report.expressions.length}
                onPrev={() => setExprIndex((i) => Math.max(0, i - 1))}
                onNext={() =>
                  setExprIndex((i) => Math.min(report.expressions.length - 1, i + 1))
                }
              />
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold text-ink-100">통화 내용</h2>
            {session ? (
              <div className="flex flex-col gap-3">
                {session.messages.map((m) => (
                  <TranscriptBubble key={m.id} message={m} reportId={report.id} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-ink-400">통화 내용을 찾을 수 없어요.</p>
            )}
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function CountdownBanner() {
  const [seconds, setSeconds] = useState(5 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex items-center justify-center gap-2 bg-coral-400 px-4 py-2 text-xs font-semibold text-ink-950">
      <span>⏰ 할인 혜택이 곧 사라져요</span>
      <span className="font-mono">
        {mm}:{ss}
      </span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-ink-800 bg-ink-900 py-4">
      <span className="text-lg font-bold text-ink-100">{value == null ? "00%" : `${value}%`}</span>
      <span className="text-xs text-ink-400">{label}</span>
    </div>
  );
}

function ExpressionCard({
  reportId,
  expression,
  index,
  total,
  onPrev,
  onNext,
}: {
  reportId: string;
  expression: Report["expressions"][number];
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const [bookmarked, setBookmarked] = useState(() => archive.isExpressionBookmarked(expression.id));
  // Reset `bookmarked` when the carousel moves to a different expression.
  // Adjusting state during render (rather than in an effect) per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [trackedId, setTrackedId] = useState(expression.id);
  if (trackedId !== expression.id) {
    setTrackedId(expression.id);
    setBookmarked(archive.isExpressionBookmarked(expression.id));
  }

  function toggleBookmark() {
    const nowBookmarked = archive.toggleExpression(expression, reportId);
    setBookmarked(nowBookmarked);
  }

  const parts = useMemo(() => {
    const idx = expression.exampleEn.indexOf(expression.highlight);
    if (idx === -1 || !expression.highlight) {
      return [{ text: expression.exampleEn, hl: false }];
    }
    return [
      { text: expression.exampleEn.slice(0, idx), hl: false },
      { text: expression.exampleEn.slice(idx, idx + expression.highlight.length), hl: true },
      { text: expression.exampleEn.slice(idx + expression.highlight.length), hl: false },
    ];
  }, [expression]);

  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-ink-400">
          {index + 1} / {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleBookmark}
            aria-label={bookmarked ? "저장 취소" : "저장"}
            aria-pressed={bookmarked}
            className={`text-sm transition ${bookmarked ? "text-mint-500" : "text-ink-400 hover:text-ink-100"}`}
          >
            🔖
          </button>
          <button
            onClick={onPrev}
            disabled={index === 0}
            className="rounded-full border border-ink-700 px-2 py-1 text-xs text-ink-100 disabled:opacity-30"
          >
            ←
          </button>
          <button
            onClick={onNext}
            disabled={index === total - 1}
            className="rounded-full border border-ink-700 px-2 py-1 text-xs text-ink-100 disabled:opacity-30"
          >
            →
          </button>
        </div>
      </div>

      <p className="mb-1 text-base font-semibold text-ink-100">{expression.phrase}</p>
      <p className="mb-3 text-xs text-ink-400">{expression.meaningKo}</p>

      <p className="mb-1 text-sm text-ink-100">
        {parts.map((p, i) =>
          p.hl ? (
            <mark key={i} className="rounded bg-mint-500/20 px-1 text-mint-500">
              {p.text}
            </mark>
          ) : (
            <span key={i}>{p.text}</span>
          )
        )}
      </p>
      <p className="mb-4 text-xs text-ink-400">{expression.exampleKo}</p>

      <Link
        href={`/reports/${reportId}/practice/${expression.id}`}
        className="inline-flex items-center gap-1 rounded-full bg-mint-500 px-4 py-2 text-xs font-semibold text-ink-950 transition hover:bg-mint-600"
      >
        🎤 연습
      </Link>
    </div>
  );
}

function TranscriptBubble({ message, reportId }: { message: ChatMessage; reportId: string }) {
  const [showKo, setShowKo] = useState(true);
  const isUser = message.role === "user";
  const sentenceId = `${reportId}:${message.id}`;
  const [bookmarked, setBookmarked] = useState(() => archive.isSentenceBookmarked(sentenceId));

  function toggleBookmark() {
    const nowBookmarked = archive.toggleSentence({
      id: sentenceId,
      reportId,
      textEn: message.textEn,
      textKo: message.textKo,
    });
    setBookmarked(nowBookmarked);
  }

  function speak() {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const utter = new SpeechSynthesisUtterance(message.textEn);
    utter.lang = "en-US";
    window.speechSynthesis.speak(utter);
  }

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
          isUser ? "bg-ink-700 text-ink-100" : "bg-ink-900 text-ink-100"
        }`}
      >
        <p>{message.textEn}</p>
        {!isUser && showKo && message.textKo && (
          <p className="mt-1 text-xs text-ink-400">{message.textKo}</p>
        )}
      </div>

      <div className="mt-1 flex items-center gap-2 text-ink-400">
        {isUser && message.paraphrase?.status === "approved" && (
          <Pill tone="mint">👍 패러프레이징</Pill>
        )}
        {!isUser && (
          <>
            <button onClick={speak} aria-label="재생" className="hover:text-ink-100">
              🔊
            </button>
            <button
              onClick={() => setShowKo((v) => !v)}
              aria-label="번역 토글"
              className="hover:text-ink-100"
            >
              🇰🇷
            </button>
            <span aria-hidden className="opacity-50">
              🚩
            </span>
            <button
              onClick={toggleBookmark}
              aria-label={bookmarked ? "저장 취소" : "저장"}
              aria-pressed={bookmarked}
              className={`transition ${bookmarked ? "text-mint-500" : "hover:text-ink-100"}`}
            >
              🔖
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function randomScore() {
  return 70 + Math.floor(Math.random() * 26);
}

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")}`;
}
