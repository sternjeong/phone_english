"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Thin wrapper around the browser's SpeechRecognition (Web Speech API).
 * Tap-to-start / tap-to-stop: call `start()` on the first tap, `stop()` on
 * the second; `stop()` resolves with whatever transcript was captured. Not
 * every browser exposes this API (notably: no Firefox support), so
 * `.supported` lets callers fall back to a text input instead of
 * dead-ending the flow.
 *
 * Also exposes:
 * - `interim` — the live, in-progress transcript while `listening` is
 *   true. A live report said "recording happens but the conversation
 *   never continues" with zero errors visible, which is exactly what an
 *   *empty final transcript* looks like (call/page.tsx silently no-ops on
 *   `if (transcript) ...`). Showing interim text turns "is it capturing
 *   anything at all?" into something directly observable on-screen.
 * - `micError` — a user-facing message when the mic permission itself is
 *   the problem. The same report also mentioned the OS never even asked
 *   for mic permission this time (unlike the first time it worked) — that
 *   points at the permission being stuck in a denied/blocked state, which
 *   `SpeechRecognition.start()` can fail silently on some browsers. Its
 *   error event is therefore always surfaced as an on-screen message.
 */

// Minimal shape of the parts of the SpeechRecognition API we use — TS's DOM
// lib doesn't ship types for this (it's still non-standard), so we declare
// just enough to stay type-safe without pulling in a whole ambient lib.
interface MinimalSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionCtor = new () => MinimalSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  }
}

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

const STOP_SAFETY_TIMEOUT_MS = 1500;
// If the browser ends the session on its own this many times in a row
// without the transcript growing at all, stop trying to restart — a real
// restart storm (some mobile Chrome builds don't actually support
// `continuous: true` and end almost immediately every time) would otherwise
// spin silently forever and never capture anything, with no sign to the
// user beyond "nothing happens after I talk".
const MAX_EMPTY_RESTARTS = 4;

const MIC_BLOCKED_MESSAGE =
  "마이크 권한이 꺼져있어요. 주소창의 자물쇠 아이콘(또는 사이트 정보) → 권한 → 마이크를 '허용'으로 바꾼 뒤 새로고침해주세요.";
const MIC_ERROR_MESSAGE = "마이크에 접근할 수 없어요. 다른 앱이 마이크를 쓰고 있지 않은지 확인해주세요.";
const NO_SPEECH_MESSAGE = "음성을 인식하지 못했어요. 다시 눌러 천천히 말하거나 텍스트로 입력해주세요.";

/** Shared mutable state a recognition instance's handlers need to see —
 * bundled into one object instead of closing over hook-scoped bindings, so
 * `attachHandlers` can call itself to restart without React's hooks/
 * closure-immutability lint treating that as an unsafe self-reference. */
interface RecognitionCtx {
  recognitionRef: React.RefObject<MinimalSpeechRecognition | null>;
  sessionTranscriptRef: React.RefObject<string>;
  committedTranscriptRef: React.RefObject<string>;
  emptyRestartsRef: React.RefObject<number>;
  stoppingRef: React.RefObject<boolean>;
  resolveStopRef: React.RefObject<((transcript: string) => void) | null>;
  setListening: (v: boolean) => void;
  setInterim: (v: string) => void;
  setMicError: (v: string | null) => void;
}

function fullTranscript(ctx: RecognitionCtx) {
  return `${ctx.committedTranscriptRef.current} ${ctx.sessionTranscriptRef.current}`.trim();
}

function log(...args: unknown[]) {
  console.log("[stt]", ...args);
}

function attachHandlers(recognition: MinimalSpeechRecognition, ctx: RecognitionCtx) {
  recognition.lang = "en-US";
  recognition.interimResults = true;
  recognition.continuous = true;
  recognition.onresult = (event) => {
    let combined = "";
    for (let i = 0; i < event.results.length; i++) {
      combined += event.results[i][0]?.transcript ?? "";
    }
    ctx.sessionTranscriptRef.current = combined;
    ctx.setInterim(fullTranscript(ctx));
    log("onresult:", JSON.stringify(combined));
  };
  recognition.onerror = (event) => {
    log("onerror:", event?.error);
    if (event?.error === "not-allowed" || event?.error === "service-not-allowed") {
      ctx.setMicError(MIC_BLOCKED_MESSAGE);
      // Retrying cannot repair a denied site permission. Let onend settle
      // the UI instead of entering an invisible restart loop.
      ctx.stoppingRef.current = true;
    } else if (event?.error === "audio-capture") {
      ctx.setMicError(MIC_ERROR_MESSAGE);
      ctx.stoppingRef.current = true;
    } else if (event?.error !== "aborted") {
      ctx.setMicError(NO_SPEECH_MESSAGE);
    }
  };
  recognition.onend = () => {
    log("onend, stopping=", ctx.stoppingRef.current, "transcriptSoFar=", JSON.stringify(fullTranscript(ctx)));
    if (ctx.stoppingRef.current) {
      // The user actually asked to stop — finalize for real.
      ctx.stoppingRef.current = false;
      ctx.setListening(false);
      ctx.recognitionRef.current = null;
      const resolve = ctx.resolveStopRef.current;
      ctx.resolveStopRef.current = null;
      resolve?.(fullTranscript(ctx));
      return;
    }
    // Chrome ended the session on its own (e.g. a no-speech timeout, or —
    // on some mobile builds — just because `continuous` isn't honored)
    // while the user is still holding the mic "on".
    const before = fullTranscript(ctx);
    if (ctx.sessionTranscriptRef.current.trim() === "") {
      ctx.emptyRestartsRef.current += 1;
    } else {
      ctx.emptyRestartsRef.current = 0;
    }
    if (ctx.emptyRestartsRef.current > MAX_EMPTY_RESTARTS) {
      log("giving up after", ctx.emptyRestartsRef.current, "empty restarts in a row");
      ctx.setListening(false);
      ctx.setMicError(NO_SPEECH_MESSAGE);
      ctx.recognitionRef.current = null;
      return;
    }
    ctx.committedTranscriptRef.current = before;
    ctx.sessionTranscriptRef.current = "";
    try {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      const next = new Ctor();
      attachHandlers(next, ctx);
      ctx.recognitionRef.current = next;
      next.start();
      log("auto-restarted, emptyRestarts=", ctx.emptyRestartsRef.current);
    } catch (err) {
      log("restart threw:", err);
      ctx.setListening(false);
      ctx.recognitionRef.current = null;
    }
  };
}

export function useSpeechToText() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [micError, setMicError] = useState<string | null>(null);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const sessionTranscriptRef = useRef(""); // this recognition instance only
  const committedTranscriptRef = useRef(""); // carried over across auto-restarts
  const emptyRestartsRef = useRef(0);
  const stoppingRef = useRef(false);
  const resolveStopRef = useRef<((transcript: string) => void) | null>(null);

  const ctx: RecognitionCtx = {
    recognitionRef,
    sessionTranscriptRef,
    committedTranscriptRef,
    emptyRestartsRef,
    stoppingRef,
    resolveStopRef,
    setListening,
    setInterim,
    setMicError,
  };

  const supported = typeof window !== "undefined" && getRecognitionCtor() != null;

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      log("no SpeechRecognition constructor available");
      return;
    }
    setMicError(null);

    committedTranscriptRef.current = "";
    sessionTranscriptRef.current = "";
    emptyRestartsRef.current = 0;
    stoppingRef.current = false;
    setInterim("");
    const recognition = new Ctor();
    attachHandlers(recognition, ctx);
    // iOS Safari requires this to remain in the original tap's synchronous
    // call stack. Awaiting getUserMedia first loses user activation and can
    // make recognition fail without ever opening the microphone.
    // Keep the ref before start(): Safari may synchronously emit end/error.
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch (err) {
      // Some mobile browsers throw synchronously here (e.g. mic permission
      // not fully settled yet) — without this, `listening` would flip true
      // for a recognizer that never actually started, and the mic button
      // would look "stuck on" with nothing to stop.
      log("start() threw synchronously:", err);
      setListening(false);
      recognitionRef.current = null;
      setMicError(MIC_ERROR_MESSAGE);
      return;
    }
    log("started");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      stoppingRef.current = true;
      try {
        recognitionRef.current?.stop();
      } catch {
        // The recognizer may already have stopped.
      }
      recognitionRef.current = null;
    };
  }, []);

  const stop = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        // Nothing running (e.g. a restart attempt just failed) — hand back
        // whatever was captured before that happened.
        log("stop() called with nothing running, resolving with", JSON.stringify(fullTranscript(ctx)));
        setListening(false);
        resolve(fullTranscript(ctx));
        return;
      }
      stoppingRef.current = true;
      const safety = setTimeout(() => {
        log("stop() safety timeout fired, resolving with", JSON.stringify(fullTranscript(ctx)));
        // A late iOS `end` must not be treated as an unexpected end and
        // restart the microphone after the utterance was already submitted.
        recognition.onend = null;
        stoppingRef.current = false;
        setListening(false);
        recognitionRef.current = null;
        resolveStopRef.current = null;
        resolve(fullTranscript(ctx));
      }, STOP_SAFETY_TIMEOUT_MS);
      resolveStopRef.current = (transcript) => {
        clearTimeout(safety);
        resolve(transcript);
      };
      try {
        recognition.stop();
      } catch (err) {
        // Already in a stopped/invalid state — onend won't fire again.
        log("recognition.stop() threw:", err);
        clearTimeout(safety);
        recognition.onend = null;
        stoppingRef.current = false;
        resolveStopRef.current = null;
        setListening(false);
        recognitionRef.current = null;
        resolve(fullTranscript(ctx));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { supported, listening, interim, micError, start, stop };
}
