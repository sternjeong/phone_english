"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Thin wrapper around the browser's SpeechRecognition (Web Speech API).
 * Tap-to-start / tap-to-stop: call `start()` on the first tap, `stop()` on
 * the second; `stop()` resolves with whatever transcript was captured. Not
 * every browser exposes this API (notably: no Firefox support), so
 * `.supported` lets callers fall back to a text input instead of
 * dead-ending the flow.
 */

// Minimal shape of the parts of the SpeechRecognition API we use — TS's DOM
// lib doesn't ship types for this (it's still non-standard), so we declare
// just enough to stay type-safe without pulling in a whole ambient lib.
interface MinimalSpeechRecognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: unknown) => void) | null;
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

// Chrome can end a recognition session on its own well before the user taps
// to stop — most commonly a "no speech detected yet" timeout that can fire
// just a few seconds after start(), even with `continuous: true`. Two bugs
// came from this in practice:
//  1. (fixed previously) if nothing was listening for `onend`, `stop()`'s
//     promise hung forever because the browser had already ended the
//     session before the user's second tap.
//  2. (fixing now) naively treating *every* `onend` as "the user is done"
//     made the mic silently stop capturing mid-sentence, before the user
//     had even finished talking, whenever Chrome's own timeout fired first.
// The fix for both: only *finalize* (resolve stop(), flip `listening` off)
// on an `onend` that followed our own explicit `.stop()` call. Any other
// `onend` is Chrome ending the session against our wishes, so we
// transparently start a fresh recognition instance and keep accumulating
// into the same transcript — the UI never has to know it happened.
const STOP_SAFETY_TIMEOUT_MS = 3000;

/** Shared mutable state a recognition instance's handlers need to see —
 * bundled into one object instead of closing over hook-scoped bindings, so
 * `attachHandlers` can call itself to restart without React's hooks/
 * closure-immutability lint treating that as an unsafe self-reference. */
interface RecognitionCtx {
  recognitionRef: React.RefObject<MinimalSpeechRecognition | null>;
  sessionTranscriptRef: React.RefObject<string>;
  committedTranscriptRef: React.RefObject<string>;
  stoppingRef: React.RefObject<boolean>;
  resolveStopRef: React.RefObject<((transcript: string) => void) | null>;
  setListening: (v: boolean) => void;
}

function fullTranscript(ctx: RecognitionCtx) {
  return `${ctx.committedTranscriptRef.current} ${ctx.sessionTranscriptRef.current}`.trim();
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
  };
  recognition.onerror = () => {
    // swallow — onend follows every onerror, which decides what happens next
  };
  recognition.onend = () => {
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
    // Chrome ended the session on its own (e.g. a no-speech timeout) while
    // the user is still holding the mic "on" — keep what was heard so far
    // and transparently pick back up instead of going silent.
    ctx.committedTranscriptRef.current = fullTranscript(ctx);
    ctx.sessionTranscriptRef.current = "";
    try {
      const Ctor = getRecognitionCtor();
      if (!Ctor) return;
      const next = new Ctor();
      attachHandlers(next, ctx);
      ctx.recognitionRef.current = next;
      next.start();
    } catch {
      // Couldn't restart — better to end cleanly than hang silently "on".
      ctx.setListening(false);
      ctx.recognitionRef.current = null;
    }
  };
}

export function useSpeechToText() {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const sessionTranscriptRef = useRef(""); // this recognition instance only
  const committedTranscriptRef = useRef(""); // carried over across auto-restarts
  const stoppingRef = useRef(false);
  const resolveStopRef = useRef<((transcript: string) => void) | null>(null);

  const ctx: RecognitionCtx = {
    recognitionRef,
    sessionTranscriptRef,
    committedTranscriptRef,
    stoppingRef,
    resolveStopRef,
    setListening,
  };

  const supported = typeof window !== "undefined" && getRecognitionCtor() != null;

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    committedTranscriptRef.current = "";
    sessionTranscriptRef.current = "";
    stoppingRef.current = false;
    const recognition = new Ctor();
    attachHandlers(recognition, ctx);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stop = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        // Nothing running (e.g. a restart attempt just failed) — hand back
        // whatever was captured before that happened.
        setListening(false);
        resolve(fullTranscript(ctx));
        return;
      }
      stoppingRef.current = true;
      const safety = setTimeout(() => {
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
      } catch {
        // Already in a stopped/invalid state — onend won't fire again.
        clearTimeout(safety);
        stoppingRef.current = false;
        resolveStopRef.current = null;
        setListening(false);
        recognitionRef.current = null;
        resolve(fullTranscript(ctx));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { supported, listening, start, stop };
}
