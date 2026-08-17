"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Thin wrapper around the browser's SpeechRecognition (Web Speech API).
 * Push-to-talk: call `start()` on mic-down, `stop()` on mic-up; `stop()`
 * resolves with whatever transcript was captured. Not every browser exposes
 * this API (notably: no Firefox support), so `.supported` lets callers fall
 * back to a text input instead of dead-ending the flow.
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

export function useSpeechToText() {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<MinimalSpeechRecognition | null>(null);
  const transcriptRef = useRef("");

  const supported = typeof window !== "undefined" && getRecognitionCtor() != null;

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
      // swallow — stop() will just return whatever we captured so far
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }, []);

  const stop = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        setListening(false);
        resolve("");
        return;
      }
      recognition.onend = () => {
        setListening(false);
        resolve(transcriptRef.current.trim());
      };
      try {
        recognition.stop();
      } catch {
        setListening(false);
        resolve(transcriptRef.current.trim());
      }
    });
  }, []);

  return { supported, listening, start, stop };
}
