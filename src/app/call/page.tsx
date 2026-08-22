"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PhoneShell } from "@/components/ui/PhoneShell";
import { TopicDial } from "@/components/call/TopicDial";
import { AiBubble, UserBubble } from "@/components/call/MessageBubble";
import { useSpeechToText } from "@/components/call/useSpeechToText";
import { storage } from "@/lib/storage";
import { useClientValue } from "@/lib/useClientValue";
import { useAsync } from "@/lib/useAsync";
import { speakText, preloadVoice } from "@/lib/tts";
import type { ChatMessage, Persona, Topic, CallSession, Report } from "@/lib/types";

const DEFAULT_CALL_SECONDS = 5 * 60;
const EXTEND_SECONDS = 3 * 60;

const DEFAULT_PERSONA: Persona = {
  id: "default",
  name: "Haze",
  personality: "따뜻하고 다정한 성격, 잘 들어주고 격려를 잘 함",
  interests: ["영화", "여행", "음악"],
};

const HINT_SEEN_KEY = "pe_seen_hint_tooltip";
const GREETING_PROMPT =
  "(the call just connected — greet the learner warmly and introduce yourself, then ask an opening question)";

type Phase = "incoming" | "active" | "ending" | "summary";

type ConverseResult = {
  paraphrase: { status: "approved" | "corrected"; corrected?: string; reason?: string };
  aiReply: { textEn: string; textKo: string };
};

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function callConverse(body: {
  persona: Persona;
  topic: Topic;
  history: ChatMessage[];
  userUtterance: string;
}): Promise<ConverseResult> {
  const res = await fetch("/api/converse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error ?? `converse failed (${res.status})`);
  }
  return res.json();
}

export default function CallPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("incoming");
  const [topic, setTopic] = useState<Topic>("me");
  const [topicDialOpen, setTopicDialOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingId, setTypingId] = useState<string | null>(null);

  const [greetingLoading, setGreetingLoading] = useState(true);
  const [greetingError, setGreetingError] = useState<string | null>(null);

  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [convoError, setConvoError] = useState<{
    userMsgId: string;
    utterance: string;
    history: ChatMessage[];
  } | null>(null);

  const [textFallback, setTextFallback] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [summary, setSummary] = useState<{ wordCount: number; reportId: string } | null>(null);

  // 기본 통화 시간 5분, "더 통화할까요?" 프롬프트에서 예 누르면 3분씩 연장.
  const [timeLimit, setTimeLimit] = useState(DEFAULT_CALL_SECONDS);
  const [extendPromptOpen, setExtendPromptOpen] = useState(false);
  const extendPromptShownFor = useRef(0);

  // Date.now() is impure, so it can't be called during render (even guarded)
  // — capture the call's start time as a mount effect instead.
  const callStartRef = useRef<number>(0);
  useEffect(() => {
    callStartRef.current = Date.now();
    // Warm up the female-voice lookup now, in parallel with the greeting
    // request, so the first speakText() call isn't the one paying for it.
    preloadVoice();
  }, []);

  const { supported: sttSupported, listening, start, stop } = useSpeechToText();

  const personaState = useAsync(() => storage.getPersona(), []);
  const personaLoading = personaState.status === "loading";
  if (personaState.status === "error") {
    // Don't block the call on a persona-fetch failure — fall back below.
    console.error("Failed to load persona:", personaState.error);
  }
  const persona = personaState.status === "ready" ? personaState.data ?? DEFAULT_PERSONA : DEFAULT_PERSONA;

  // First-call hint tooltip: derived straight from localStorage so it
  // updates the instant answerCall() flips the flag, no extra state needed.
  const showHint = useClientValue(
    () => typeof window !== "undefined" && !window.localStorage.getItem(HINT_SEEN_KEY),
    false
  );

  // Timer, ticking while the call is live.
  useEffect(() => {
    if (phase === "ending" || phase === "summary") return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - callStartRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // 기본 통화 5분이 지나면 "더 통화할까요?" 오버레이를 띄운다. 한 번 물어본
  // 한도(extendPromptShownFor)는 다시 안 묻도록 기록해둔다 — setInterval이
  // 초 단위로 계속 도는 동안 elapsed가 timeLimit을 넘긴 매 틱마다 다시
  // 열리는 걸 막기 위함.
  useEffect(() => {
    if (phase !== "active") return;
    if (elapsed >= timeLimit && extendPromptShownFor.current !== timeLimit) {
      extendPromptShownFor.current = timeLimit;
      setExtendPromptOpen(true);
    }
  }, [elapsed, timeLimit, phase]);

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // Phase 1: fetch the AI's opening greeting.
  const fetchGreeting = useCallback(async () => {
    setGreetingLoading(true);
    setGreetingError(null);
    try {
      const result = await callConverse({
        persona,
        topic,
        history: [],
        userUtterance: GREETING_PROMPT,
      });
      const aiMsg: ChatMessage = {
        id: newId(),
        role: "ai",
        textEn: result.aiReply.textEn,
        textKo: result.aiReply.textKo,
        createdAt: Date.now(),
      };
      setMessages([aiMsg]);
      setTypingId(aiMsg.id);
      speakText(aiMsg.textEn);
    } catch (err) {
      setGreetingError(err instanceof Error ? err.message : "AI 응답을 가져오지 못했어요");
    } finally {
      setGreetingLoading(false);
    }
  }, [persona, topic]);

  // Canonical data-fetching-on-mount effect (kicks off a request and sets
  // loading state) — waits for the persona fetch to resolve (or fail) so
  // the greeting call always uses the real persona, not a flash of the
  // default; only fires once persona is settled.
  useEffect(() => {
    if (personaLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGreeting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personaLoading]);

  const answerCall = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(HINT_SEEN_KEY, "1");
    }
    // "5분 통화"는 받은 시점부터 재는 게 맞으므로, 수신 화면에 머문 시간은
    // 제외하고 여기서 시계를 다시 0으로 맞춘다.
    callStartRef.current = Date.now();
    setElapsed(0);
    setPhase("active");
  };

  const declineCall = () => {
    router.push("/");
  };

  const handleExtend = () => {
    setTimeLimit((t) => t + EXTEND_SECONDS);
    setExtendPromptOpen(false);
  };

  const handleDeclineExtend = () => {
    setExtendPromptOpen(false);
    endCall();
  };

  // Send one user utterance through the converse loop.
  const sendUtterance = useCallback(
    async (transcript: string, historySnapshot: ChatMessage[]) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        id: newId(),
        role: "user",
        textEn: trimmed,
        paraphrase: { status: "pending" },
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setPendingUserId(userMsg.id);
      setConvoError(null);

      try {
        const result = await callConverse({
          persona,
          topic,
          history: historySnapshot,
          userUtterance: trimmed,
        });
        const aiMsg: ChatMessage = {
          id: newId(),
          role: "ai",
          textEn: result.aiReply.textEn,
          textKo: result.aiReply.textKo,
          createdAt: Date.now(),
        };
        setMessages((prev) => [
          ...prev.map((m) => (m.id === userMsg.id ? { ...m, paraphrase: result.paraphrase } : m)),
          aiMsg,
        ]);
        setTypingId(aiMsg.id);
        speakText(aiMsg.textEn);
      } catch (err) {
        setConvoError({
          userMsgId: userMsg.id,
          utterance: trimmed,
          history: historySnapshot,
        });
        void err;
      } finally {
        setPendingUserId(null);
      }
    },
    [persona, topic]
  );

  const retryConvo = () => {
    if (!convoError) return;
    // Drop the failed user bubble and re-send — sendUtterance will re-add it.
    setMessages((prev) => prev.filter((m) => m.id !== convoError.userMsgId));
    setConvoError(null);
    sendUtterance(convoError.utterance, convoError.history);
  };

  // 탭-토글 방식: 한 번 누르면 녹음 시작, 다시 누르면 녹음 종료 후 전송.
  // (기존엔 누르고 있는 동안만 녹음되는 방식이라 불편하다는 피드백 반영)
  const historyBeforeNext = useMemo(() => messages, [messages]);

  const handleMicToggle = async () => {
    if (!sttSupported || pendingUserId) return;
    if (listening) {
      const transcript = await stop();
      if (transcript) sendUtterance(transcript, historyBeforeNext);
      return;
    }
    start();
  };

  const handleTextSubmit = () => {
    if (!textFallback.trim() || pendingUserId) return;
    sendUtterance(textFallback, historyBeforeNext);
    setTextFallback("");
  };

  // Phase 3: end call, save session + report, show word-count beat, navigate.
  const endCall = async () => {
    setPhase("ending");
    window.speechSynthesis?.cancel();

    const session: CallSession = {
      id: newId(),
      personaId: persona.id,
      topic,
      startedAt: callStartRef.current,
      endedAt: Date.now(),
      messages,
    };
    storage.saveSession(session);

    const wordCount = messages
      .filter((m) => m.role === "user")
      .reduce((sum, m) => sum + m.textEn.split(/\s+/).filter(Boolean).length, 0);

    let title = "오늘의 통화";
    let expressions: Report["expressions"] = [];
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (res.ok) {
        const data = await res.json();
        title = data.title ?? title;
        expressions = data.expressions ?? [];
      }
    } catch {
      // fall back silently — report route unreachable (e.g. no API key yet)
    }

    // MVP heuristic: no real audio analysis is available (Web Speech API
    // exposes no confidence/prosody data), so these are randomized-but-
    // plausible stand-in scores until real pronunciation scoring exists.
    const stubScore = () => Math.floor(70 + Math.random() * 28);

    const report: Report = {
      id: newId(),
      callSessionId: session.id,
      title,
      createdAt: Date.now(),
      wordCount,
      reviewed: false,
      pronunciation: stubScore(),
      prosody: stubScore(),
      fluency: stubScore(),
      expressions,
    };
    storage.saveReport(report);
    storage.addWords(wordCount);

    setSummary({ wordCount, reportId: report.id });
    setPhase("summary");

    setTimeout(() => {
      router.push(`/reports/${report.id}`);
    }, 2200);
  };

  if (personaLoading) {
    // Blank placeholder while the persona fetch is in flight — mirrors the
    // pre-hydration blank state the old localStorage-backed version showed
    // synchronously. Don't show the incoming-call UI or start the greeting
    // fetch until persona is resolved (fetchGreeting's effect is gated on
    // personaLoading above).
    return (
      <PhoneShell tone="ink">
        <div className="flex h-full flex-col items-center justify-center bg-ink-950 text-ink-400">
          <div className="text-sm">연결 중…</div>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell tone="ink">
      {phase === "summary" && summary ? (
        <div className="flex h-full flex-col items-center justify-center gap-4 bg-ink-950">
          <div className="text-7xl font-bold text-mint-500 drop-shadow-[0_0_24px_rgba(53,214,140,0.55)]">
            {summary.wordCount}
          </div>
          <div className="rounded-full bg-ink-800 px-4 py-1.5 text-sm text-ink-100">
            🔥 내가 말한 단어
          </div>
          <button
            onClick={() => router.push(`/reports/${summary.reportId}`)}
            className="mt-6 rounded-full bg-ink-100 px-6 py-2 text-sm font-medium text-ink-950"
          >
            다음
          </button>
        </div>
      ) : phase === "ending" ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 bg-ink-950 text-ink-400">
          <div className="text-sm">리포트를 만들고 있어요…</div>
        </div>
      ) : (
        <div className="relative flex h-full flex-col">
          {/* Header — shared by incoming + active phases */}
          <div className="relative flex items-center justify-between px-5 pt-6">
            <button aria-label="힌트" className="relative text-xl">
              💡
              {showHint && phase === "incoming" && (
                <div className="absolute left-0 top-8 w-48 rounded-xl border border-ink-700 bg-ink-800 p-3 text-left text-xs font-normal leading-snug text-ink-100 shadow-xl">
                  <span className="absolute -top-2 left-3 text-ink-700">▲</span>
                  대화가 막힐 때는 힌트를 사용해보세요
                </div>
              )}
            </button>
            <div className="text-sm tabular-nums text-ink-400">
              {mm}:{ss}
            </div>
            <button aria-label="설정" className="text-xl">
              ⚙️
            </button>
          </div>

          <div className="mt-2 text-center text-3xl font-semibold" style={{ fontFamily: "cursive" }}>
            {persona.name}
          </div>

          {phase === "incoming" ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              {greetingLoading && <div className="text-sm text-ink-400">연결 중…</div>}
              {greetingError && (
                <div className="flex flex-col items-center gap-2">
                  <div className="text-sm text-coral-400">AI 응답을 가져오지 못했어요</div>
                  <button
                    onClick={fetchGreeting}
                    className="rounded-full border border-coral-400/40 px-3 py-1 text-xs text-coral-400"
                  >
                    다시 시도
                  </button>
                </div>
              )}
              {!greetingLoading && messages[0] && (
                <div>
                  <div className="text-base text-ink-100">{messages[0].textEn}</div>
                  {messages[0].textKo && (
                    <div className="mt-1 text-sm text-ink-400">{messages[0].textKo}</div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
              {messages.map((m) =>
                m.role === "ai" ? (
                  <AiBubble
                    key={m.id}
                    message={m}
                    typing={typingId === m.id}
                    onTypingDone={() => setTypingId((cur) => (cur === m.id ? null : cur))}
                  />
                ) : (
                  <UserBubble
                    key={m.id}
                    message={m}
                    error={convoError?.userMsgId === m.id}
                    onRetry={convoError?.userMsgId === m.id ? retryConvo : undefined}
                  />
                )
              )}
            </div>
          )}

          {/* Bottom controls */}
          <div className="px-6 pb-8 pt-3">
            {phase === "incoming" ? (
              <div className="flex items-center justify-center gap-10">
                <button
                  onClick={declineCall}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-coral-600 text-2xl text-white shadow-lg"
                  aria-label="거절"
                >
                  ✕
                </button>
                <button
                  onClick={answerCall}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-mint-500 text-2xl text-white shadow-lg"
                  aria-label="받기"
                >
                  📞
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {!sttSupported && (
                  <div className="flex items-center gap-2">
                    <input
                      value={textFallback}
                      onChange={(e) => setTextFallback(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTextSubmit()}
                      placeholder="음성 인식이 지원되지 않아요 — 텍스트로 입력하세요"
                      className="flex-1 rounded-full border border-ink-700 bg-ink-900 px-4 py-2 text-sm text-ink-100 placeholder:text-ink-400"
                    />
                    <button
                      onClick={handleTextSubmit}
                      disabled={!!pendingUserId}
                      className="rounded-full bg-mint-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    >
                      전송
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-center gap-8">
                  <button
                    onClick={endCall}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-coral-600 text-xl text-white shadow-lg"
                    aria-label="종료"
                  >
                    📴
                  </button>
                  <button
                    onClick={handleMicToggle}
                    disabled={!sttSupported || !!pendingUserId}
                    className={`flex h-14 w-14 items-center justify-center rounded-full text-xl text-white shadow-lg transition disabled:opacity-40 ${
                      listening ? "animate-pulse bg-mint-500" : "bg-ink-700"
                    }`}
                    aria-label={listening ? "말하기 종료" : "말하기 시작"}
                  >
                    🎤
                  </button>
                  <button
                    onClick={() => setTopicDialOpen(true)}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-700 text-xl text-white shadow-lg"
                    aria-label="주제"
                  >
                    🔘
                  </button>
                </div>
                {listening ? (
                  <div className="text-center text-xs text-mint-500">
                    듣고 있어요… 다시 누르면 전송돼요
                  </div>
                ) : (
                  pendingUserId && (
                    <div className="text-center text-xs text-ink-400">응답을 기다리는 중…</div>
                  )
                )}
              </div>
            )}
          </div>

          {topicDialOpen && (
            <TopicDial
              current={topic}
              onSelect={(t) => {
                setTopic(t);
                setTopicDialOpen(false);
              }}
              onClose={() => setTopicDialOpen(false)}
            />
          )}

          {extendPromptOpen && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/70 px-8">
              <div className="w-full max-w-xs rounded-2xl border border-ink-700 bg-ink-900 p-6 text-center">
                <p className="mb-1 text-base font-semibold text-ink-100">
                  {Math.floor(timeLimit / 60)}분이 지났어요
                </p>
                <p className="mb-5 text-sm text-ink-400">
                  {Math.floor(EXTEND_SECONDS / 60)}분 더 통화할까요?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeclineExtend}
                    className="flex-1 rounded-full border border-ink-700 py-2.5 text-sm font-medium text-ink-100 transition hover:border-coral-400 hover:text-coral-400"
                  >
                    종료할게요
                  </button>
                  <button
                    onClick={handleExtend}
                    className="flex-1 rounded-full bg-mint-500 py-2.5 text-sm font-semibold text-ink-950 transition hover:bg-mint-600"
                  >
                    더 할래요
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </PhoneShell>
  );
}
