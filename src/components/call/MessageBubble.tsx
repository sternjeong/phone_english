"use client";

import { useEffect, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import { Pill } from "@/components/ui/Pill";

/** Reveals `text` a few characters at a time to mimic the streaming/typing
 * effect from SCREEN 07's AI replies. Calls `onDone` once fully revealed. */
function useTypewriter(text: string, active: boolean, onDone?: () => void) {
  const [shown, setShown] = useState(active ? "" : text);

  // Synchronizing with a genuine external timer (setInterval) to drive a
  // character-reveal animation — the canonical valid effect use case.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!active) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    // Sized so the reveal takes ~450ms total regardless of reply length —
    // long enough to read as "typing", short enough not to add perceptible
    // delay on top of the network round trip (part of the latency pass;
    // this used to be a flat ~1.1s no matter how short the reply was).
    const step = Math.max(1, Math.round(text.length / 35));
    const id = setInterval(() => {
      i += step;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDone?.();
      }
    }, 13);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return shown;
}

export function AiBubble({
  message,
  typing,
  onTypingDone,
}: {
  message: ChatMessage;
  typing: boolean;
  onTypingDone?: () => void;
}) {
  const shown = useTypewriter(message.textEn, typing, onTypingDone);
  const doneTyping = shown.length >= message.textEn.length;

  return (
    <div className="flex flex-col items-start gap-1 self-start max-w-[80%]">
      <div className="rounded-2xl rounded-tl-sm bg-ink-800 px-4 py-2 text-sm text-ink-100">
        {shown}
        {!doneTyping && <span className="animate-pulse">▍</span>}
      </div>
      {doneTyping && message.textKo && (
        <div className="px-1 text-xs text-ink-400">{message.textKo}</div>
      )}
    </div>
  );
}

export function UserBubble({
  message,
  error,
  onRetry,
}: {
  message: ChatMessage;
  error?: boolean;
  onRetry?: () => void;
}) {
  const status = message.paraphrase?.status;

  return (
    <div className="flex flex-col items-end gap-1 self-end max-w-[80%] ml-auto">
      <div className="rounded-2xl rounded-tr-sm bg-ink-700 px-4 py-2 text-sm text-ink-100">
        {message.textEn}
      </div>

      {error ? (
        <div className="flex flex-col items-end gap-1 px-1">
          <span className="text-xs text-coral-400">AI 응답을 가져오지 못했어요</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="rounded-full border border-coral-400/40 px-2 py-0.5 text-xs text-coral-400"
            >
              다시 시도
            </button>
          )}
        </div>
      ) : status === "pending" || status === undefined ? (
        <div className="px-1 text-xs text-ink-400">패러프레이징 하고 있어요…</div>
      ) : status === "approved" ? (
        <Pill tone="mint">👍 패러프레이징</Pill>
      ) : (
        <div className="max-w-full rounded-xl border border-mint-500/30 bg-mint-500/10 px-3 py-2 text-right text-xs">
          <div className="font-medium text-mint-500">{message.paraphrase?.corrected}</div>
          {message.paraphrase?.reason && (
            <div className="mt-0.5 text-ink-400">{message.paraphrase.reason}</div>
          )}
        </div>
      )}
    </div>
  );
}
