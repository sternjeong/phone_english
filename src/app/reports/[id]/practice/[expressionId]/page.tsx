"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { PhoneShell } from "@/components/ui/PhoneShell";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { storage } from "@/lib/storage";
import { useAsync } from "@/lib/useAsync";
import { useSpeechToText } from "@/components/call/useSpeechToText";
import { speakText } from "@/lib/tts";
import type { Expression, PracticeAttempt, WordScore } from "@/lib/types";

/**
 * SCREEN 11 — shadowing/pronunciation practice. Full-screen story-style UI
 * for one Expression at a time. See docs/PROJECT_NOTES.md "표현 섀도잉".
 *
 * IMPORTANT — scoring is an MVP heuristic, not real audio analysis (an
 * explicit open question in PROJECT_NOTES.md: "유창성 점수 산출 방식은
 * 단순화 필요"). We diff the SpeechRecognition transcript against the
 * target sentence word-by-word (normalized, positional match with a light
 * Levenshtein fallback for near-misses) and grade each word good/ok/poor.
 * There is no real pronunciation/prosody signal here — sub-scores are all
 * derived from the same match ratio with slight jitter, purely cosmetic.
 */
export default function ShadowingPracticePage() {
  const params = useParams<{ id: string; expressionId: string }>();
  const router = useRouter();
  const reportState = useAsync(() => storage.getReport(params.id), [params.id]);
  const report = reportState.status === "ready" ? reportState.data : null;
  const [hideScript, setHideScript] = useState(false);
  const [attempt, setAttempt] = useState<PracticeAttempt | null>(null);
  const { supported: sttSupported, listening: recording, start, stop } = useSpeechToText();

  // "🔊 나" self-playback: records the mic alongside SpeechRecognition via a
  // separate MediaRecorder/getUserMedia stream (SpeechRecognition doesn't
  // expose the raw audio it captured). Gracefully no-ops if unsupported or
  // mic permission is denied — the button just never appears.
  const micSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof window.MediaRecorder !== "undefined";
  const [myRecordingUrl, setMyRecordingUrl] = useState<string | null>(null);
  const myRecordingUrlRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  function setRecordingUrl(url: string | null) {
    if (myRecordingUrlRef.current) URL.revokeObjectURL(myRecordingUrlRef.current);
    myRecordingUrlRef.current = url;
    setMyRecordingUrl(url);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (myRecordingUrlRef.current) URL.revokeObjectURL(myRecordingUrlRef.current);
    };
  }, []);

  async function startMyRecording() {
    if (!micSupported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch {
      // permission denied, or no mic — self-playback just won't be available
      streamRef.current = null;
      mediaRecorderRef.current = null;
    }
  }

  function stopMyRecording(): Promise<void> {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve();
        return;
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        chunksRef.current = [];
        setRecordingUrl(URL.createObjectURL(blob));
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        resolve();
      };
      recorder.stop();
    });
  }

  function playMyRecording() {
    if (!myRecordingUrl) return;
    new Audio(myRecordingUrl).play().catch(() => {});
  }

  if (reportState.status === "loading") {
    return <PhoneShell tone="ink">{null}</PhoneShell>;
  }

  if (reportState.status === "error" || report === null || report.expressions.length === 0) {
    return (
      <PhoneShell tone="ink">
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-ink-100">
            {reportState.status === "error" ? "불러오지 못했어요" : "연습할 표현을 찾을 수 없어요"}
          </p>
          <button
            onClick={() => router.back()}
            className="text-sm text-mint-500 underline"
          >
            뒤로가기
          </button>
        </div>
      </PhoneShell>
    );
  }

  const index = Math.max(
    0,
    report.expressions.findIndex((e) => e.id === params.expressionId)
  );
  const expr = report.expressions[index];
  const total = report.expressions.length;

  function goTo(newIndex: number) {
    setAttempt(null);
    setRecordingUrl(null);
    router.replace(`/reports/${params.id}/practice/${report!.expressions[newIndex].id}`);
  }

  function speak(text: string) {
    speakText(text);
  }

  async function toggleRecording() {
    if (recording) {
      const [transcript] = await Promise.all([stop(), stopMyRecording()]);
      if (transcript) setAttempt(scoreAttempt(expr, transcript));
      return;
    }
    setRecordingUrl(null);
    start();
    startMyRecording();
  }

  return (
    <PhoneShell tone="ink">
      <div className="flex flex-1 flex-col px-6 py-6">
        {/* top bar: progress + close */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex flex-1 gap-1">
            {report.expressions.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full ${
                  i <= index ? "bg-mint-500" : "bg-ink-800"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => router.push(`/reports/${params.id}`)}
            aria-label="닫기"
            className="text-ink-400 transition hover:text-ink-100"
          >
            ✕
          </button>
        </div>
        <p className="mb-6 text-center text-xs text-ink-400">
          {index + 1} / {total}
        </p>

        <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
          <button
            onClick={() => speak(expr.exampleEn)}
            aria-label="원어민 발음 듣기"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-mint-500 text-ink-950 transition hover:bg-mint-600"
          >
            🔊
          </button>

          <div className="relative w-full">
            {hideScript ? (
              <div
                onClick={() => setHideScript(false)}
                className="cursor-pointer rounded-2xl border border-dashed border-ink-700 py-8 text-sm text-ink-400"
              >
                탭해서 스크립트 보기
              </div>
            ) : attempt ? (
              <p className="text-xl font-semibold leading-snug">
                {attempt.wordScores.map((ws, i) => (
                  <span key={i} className={`${gradeColor(ws.grade)} mr-1.5`}>
                    {ws.word}
                  </span>
                ))}
              </p>
            ) : (
              <p className="text-xl font-semibold leading-snug text-ink-100">{expr.exampleEn}</p>
            )}
            <button
              onClick={() => setHideScript((v) => !v)}
              aria-label="스크립트 숨기기/보기"
              className="absolute -top-2 right-0 translate-x-full pl-3 text-ink-400 transition hover:text-ink-100"
            >
              {hideScript ? "🙈" : "👁️"}
            </button>
          </div>

          {!hideScript && <p className="text-sm text-ink-400">{expr.exampleKo}</p>}
        </div>

        {!sttSupported && (
          <p className="mb-2 text-center text-xs text-coral-400">
            이 브라우저는 음성 인식을 지원하지 않아요. Chrome에서 시도해보세요.
          </p>
        )}

        {!attempt ? (
          <div className="flex flex-col items-center gap-2 pb-4">
            <p className="text-xs text-ink-400">따라 말해보세요</p>
            <button
              onClick={toggleRecording}
              disabled={!sttSupported}
              aria-label="녹음"
              className={`flex h-16 w-16 items-center justify-center rounded-full text-2xl transition disabled:opacity-30 ${
                recording ? "animate-pulse bg-coral-400" : "bg-coral-400 hover:bg-coral-600"
              }`}
            >
              🎤
            </button>
          </div>
        ) : (
          <ResultPanel
            attempt={attempt}
            onRetry={() => {
              setAttempt(null);
              setRecordingUrl(null);
            }}
            onNext={index < total - 1 ? () => goTo(index + 1) : undefined}
            onNative={() => speak(expr.exampleEn)}
            onPlayMine={myRecordingUrl ? playMyRecording : undefined}
          />
        )}
      </div>
    </PhoneShell>
  );
}

function ResultPanel({
  attempt,
  onRetry,
  onNext,
  onNative,
  onPlayMine,
}: {
  attempt: PracticeAttempt;
  onRetry: () => void;
  onNext?: () => void;
  onNative: () => void;
  onPlayMine?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-4 border-t border-ink-800 pt-4">
      <ScoreGauge value={attempt.overall} label={gradeLabel(attempt.overall)} size={140} />
      <div className="grid w-full grid-cols-3 gap-2 text-center text-xs">
        <div>
          <p className="font-semibold text-ink-100">{attempt.pronunciation}%</p>
          <p className="text-ink-400">발음</p>
        </div>
        <div>
          <p className="font-semibold text-ink-100">{attempt.prosody}%</p>
          <p className="text-ink-400">운율</p>
        </div>
        <div>
          <p className="font-semibold text-ink-100">{attempt.fluency}%</p>
          <p className="text-ink-400">유창</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button onClick={onNative} className="text-xs text-ink-400 underline">
          🔊 원어민 다시 듣기
        </button>
        {onPlayMine && (
          <button onClick={onPlayMine} className="text-xs text-ink-400 underline">
            🔊 나
          </button>
        )}
      </div>
      <div className="flex w-full gap-2">
        <button
          onClick={onRetry}
          className="flex-1 rounded-full border border-ink-700 py-3 text-sm font-semibold text-ink-100 transition hover:border-mint-500"
        >
          ↺ 다시
        </button>
        {onNext && (
          <button
            onClick={onNext}
            className="flex-1 rounded-full bg-mint-500 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-600"
          >
            다음 →
          </button>
        )}
      </div>
    </div>
  );
}

function gradeColor(grade: WordScore["grade"]) {
  if (grade === "good") return "text-mint-500";
  if (grade === "ok") return "text-amber-400";
  return "text-coral-400";
}

function gradeLabel(score: number) {
  if (score >= 90) return "Great!";
  if (score >= 70) return "Good";
  if (score >= 50) return "Okay";
  return "Keep trying";
}

function normalize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Levenshtein distance between two words, used to grade near-misses. */
function wordDistance(a: string, b: string) {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function scoreAttempt(expr: Expression, transcript: string): PracticeAttempt {
  const target = normalize(expr.exampleEn);
  const heard = normalize(transcript);

  const wordScores: WordScore[] = target.map((word, i) => {
    const candidate = heard[i];
    if (!candidate) return { word, grade: "poor" };
    if (candidate === word) return { word, grade: "good" };
    const dist = wordDistance(word, candidate);
    const ratio = dist / Math.max(word.length, candidate.length, 1);
    if (ratio <= 0.3) return { word, grade: "good" };
    if (ratio <= 0.6) return { word, grade: "ok" };
    return { word, grade: "poor" };
  });

  const goodCount = wordScores.filter((w) => w.grade === "good").length;
  const okCount = wordScores.filter((w) => w.grade === "ok").length;
  const overall =
    target.length === 0
      ? 0
      : Math.round(((goodCount + okCount * 0.5) / target.length) * 100);

  // Sub-scores are cosmetic jitter around the same match ratio — there is
  // no real per-signal (pronunciation vs. prosody vs. fluency) analysis in
  // this MVP heuristic.
  const jitter = () => Math.max(0, Math.min(100, overall + Math.round((Math.random() - 0.5) * 12)));

  return {
    expressionId: expr.id,
    overall,
    pronunciation: jitter(),
    prosody: jitter(),
    fluency: jitter(),
    wordScores,
  };
}
