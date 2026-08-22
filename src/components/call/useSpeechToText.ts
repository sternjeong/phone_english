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

// Chrome will auto-end a recognizer on its own (e.g. after a silence
// timeout) even with `continuous: true`. If that happens *before* the user
// taps the mic again, `stop()` had nothing to call `.stop()` on and its
// promise would hang forever — the bug reported live: tapping to stop did
// nothing and the conversation never continued. A hard safety timeout
// guarantees `stop()` always resolves even if the browser never fires
// `onend` again after we call `.stop()`.
const STOP_SAFETY_TIMEOUT_MS = 3000;

export function useSpeechToText() {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const transcriptRef = useRef("");
  const resolveStopRef = useRef<((transcript: string) => void) | null>(null);

  const supported = typeof window !== "undefined" && getRecognitionCtor() != null;

  const settle = useCallback(() => {
    setListening(false);
    recognitionRef.current = null;
    const resolve = resolveStopRef.current;
    resolveStopRef.current = null;
    resolve?.(transcriptRef.current.trim());
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    transcriptRef.current = "";
    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let combined = "";
      for (let i = 0; i < event.results.length; i++) {
        combined += event.results[i][0]?.transcript ?? "";
      }
      transcriptRef.current = combined;
    };
    recognition.onerror = () => {
      // swallow — settle() (via onend) resolves with whatever was captured
    };
    // Fires whether *we* called stop() or the browser ended the session on
    // its own — this is what makes an unexpected auto-end recoverable
    // instead of leaving `listening` stuck true with no way to reset it.
    recognition.onend = settle;
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, [settle]);

  const stop = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        // Already ended (e.g. an auto-timeout beat us to it) — nothing to
        // stop, just hand back whatever was captured before that happened.
        setListening(false);
        resolve(transcriptRef.current.trim());
        return;
      }
      resolveStopRef.current = resolve;
      const safety = setTimeout(settle, STOP_SAFETY_TIMEOUT_MS);
      const originalResolve = resolveStopRef.current;
      resolveStopRef.current = (transcript) => {
        clearTimeout(safety);
        originalResolve(transcript);
      };
      try {
        recognition.stop();
      } catch {
        // Already in a stopped/invalid state — onend won't fire again.
        clearTimeout(safety);
        settle();
      }
    });
  }, [settle]);

  return { supported, listening, start, stop };
}
