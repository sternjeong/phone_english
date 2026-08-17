"use client";

import type { Topic } from "@/lib/types";

/**
 * SCREEN 08 — topic switcher. Spec describes a radial dial; we implement it
 * as a simple centered 2x2 grid of options inside a blurred overlay, which
 * carries the same interaction (pick a topic, closes) without needing exact
 * circular geometry.
 */

const TOPICS: { id: Topic; label: string; emoji: string; description: string }[] = [
  { id: "me", label: "나", emoji: "🙂", description: "나의 성격과 가치관을 알아보는 질문" },
  { id: "career", label: "커리어", emoji: "🌱", description: "커리어에 대한 질문" },
  { id: "relationships", label: "관계", emoji: "❤️", description: "관계에 대한 질문" },
  { id: "emotions", label: "감정", emoji: "😊", description: "감정에 대한 질문" },
];

export function TopicDial({
  current,
  onSelect,
  onClose,
}: {
  current: Topic;
  onSelect: (topic: Topic) => void;
  onClose: () => void;
}) {
  const currentInfo = TOPICS.find((t) => t.id === current)!;

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-ink-950/80 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        aria-label="닫기"
        onClick={onClose}
        className="absolute top-6 right-6 flex h-9 w-9 items-center justify-center rounded-full border border-ink-700 text-ink-100"
      >
        ✕
      </button>

      <div className="text-center">
        <div className="text-3xl">{currentInfo.emoji}</div>
        <div className="mt-1 text-lg font-semibold">{currentInfo.label}</div>
        <div className="mt-1 text-xs text-ink-400">{currentInfo.description}</div>
      </div>

      <div
        className="grid grid-cols-2 gap-4 px-8"
        onClick={(e) => e.stopPropagation()}
      >
        {TOPICS.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`flex w-32 flex-col items-center gap-1 rounded-2xl border px-4 py-5 transition ${
              t.id === current
                ? "border-mint-500 bg-mint-500/10 text-mint-500"
                : "border-ink-700 bg-ink-900 text-ink-100"
            }`}
          >
            <span className="text-2xl">{t.emoji}</span>
            <span className="text-sm font-medium">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
