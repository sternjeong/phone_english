"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PhoneShell } from "@/components/ui/PhoneShell";
import { Pill } from "@/components/ui/Pill";
import { storage } from "@/lib/storage";
import { useAsync } from "@/lib/useAsync";
import { speakText, unlockSpeechSynthesis, VOICE_OPTIONS } from "@/lib/tts";
import type { Persona } from "@/lib/types";

/**
 * Onboarding: SCREEN 05 marketing teaser, then a persona setup form.
 * See docs/PROJECT_NOTES.md "온보딩/마케팅 티저 화면" + MVP scope item 1.
 */

const INTEREST_CHIPS = [
  "여행", "영화", "음악", "운동", "게임", "요리", "독서", "커리어", "반려동물", "K-POP",
];

const PERSONALITY_PRESETS = [
  "다정하고 유쾌한", "차분하고 진지한", "장난기 많고 밝은", "지적이고 호기심 많은",
];

export default function OnboardingPage() {
  const existingState = useAsync(() => storage.getPersona(), []);
  // Editing an existing persona: skip the marketing teaser (nothing to sell
  // someone who already has a friend) and go straight to a pre-filled form.
  // Waiting for the fetch to settle, then keying the form by the resulting
  // persona id, means the form's own useState() initializers do the
  // pre-filling — no effect-driven setState needed.
  if (existingState.status === "loading") return null;
  const existing = existingState.status === "ready" ? existingState.data : null;
  return <OnboardingForm key={existing?.id ?? "new"} existing={existing} />;
}

function OnboardingForm({ existing }: { existing: Persona | null }) {
  const router = useRouter();
  const [step, setStep] = useState<"teaser" | "form">(existing ? "form" : "teaser");

  const [name, setName] = useState(existing?.name ?? "Haze");
  const [personality, setPersonality] = useState(existing?.personality ?? PERSONALITY_PRESETS[0]);
  const [interests, setInterests] = useState<string[]>(existing?.interests ?? []);
  const [customInterest, setCustomInterest] = useState("");
  const [voiceId, setVoiceId] = useState(existing?.voiceId ?? VOICE_OPTIONS[0].id);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  function previewVoice(id: string) {
    unlockSpeechSynthesis();
    speakText("Hi! I'm excited to practice English with you.", id);
  }

  function toggleInterest(chip: string) {
    setInterests((prev) =>
      prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]
    );
  }

  function addCustomInterest() {
    const v = customInterest.trim();
    if (v && !interests.includes(v)) {
      setInterests((prev) => [...prev, v]);
    }
    setCustomInterest("");
  }

  async function handleSubmit() {
    const trimmedName = name.trim() || "Haze";
    setSaving(true);
    setSaveError(null);
    try {
      await storage.setPersona({
        id: existing?.id ?? crypto.randomUUID(),
        name: trimmedName,
        personality,
        interests: interests.length > 0 ? interests : ["일상 대화"],
        voiceId,
      });
      router.push("/");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "저장하지 못했어요. 다시 시도해주세요.");
      setSaving(false);
    }
  }

  if (step === "teaser") {
    return (
      <PhoneShell tone="ink">
        <div className="flex flex-1 flex-col justify-between px-6 py-10">
          <div>
            <p className="mb-2 text-sm font-medium text-mint-500">전화 영어</p>
            <h1 className="text-3xl font-bold leading-snug text-ink-100">
              대화를 분석해
              <br />더 유창하게 말할 수 있게
              <br />도와줄게요
            </h1>
          </div>

          {/* illustrative report preview cards, per SCREEN 05 */}
          <div className="relative my-10 flex flex-col items-center gap-4">
            <div className="w-full max-w-[280px] rounded-2xl border border-ink-700 bg-ink-900 p-4 shadow-xl">
              <p className="mb-1 text-xs text-ink-400">check out / 확인하다</p>
              <p className="text-sm text-ink-100">
                I think you should{" "}
                <span className="rounded bg-amber-400/20 px-1 text-amber-400">
                  recommended
                </span>{" "}
                that place.
              </p>
            </div>
            <div className="w-full max-w-[280px] rounded-2xl border border-ink-700 bg-ink-900 p-4 shadow-xl">
              <p className="mb-2 text-xs text-ink-400">종종 머뭇거리고 있어요</p>
              <div className="mb-2 flex h-2 w-full overflow-hidden rounded-full">
                <div className="h-full bg-mint-500" style={{ width: "80%" }} />
                <div className="h-full bg-ink-700" style={{ width: "20%" }} />
              </div>
              <div className="flex justify-between text-[11px] text-ink-400">
                <span>자연스러운 속도 80%</span>
                <span>느린 속도 20%</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setStep("form")}
            className="w-full rounded-full bg-mint-500 py-4 text-sm font-semibold text-ink-950 transition hover:bg-mint-600"
          >
            시작하기
          </button>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell tone="ink">
      <div className="flex flex-1 flex-col overflow-y-auto px-6 py-8">
        <button
          onClick={() => setStep("teaser")}
          className="mb-4 self-start text-sm text-ink-400 transition hover:text-ink-100"
        >
          ← 뒤로
        </button>

        <h2 className="mb-1 text-2xl font-bold text-ink-100">
          {existing ? "AI 친구 설정 바꾸기" : "AI 친구를 만들어볼까요?"}
        </h2>
        <p className="mb-8 text-sm text-ink-400">이름, 성격, 관심사, 목소리를 설정하면 대화가 시작돼요.</p>

        <label className="mb-2 text-sm font-medium text-ink-100">이름</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: Haze"
          className="mb-6 w-full rounded-xl border border-ink-700 bg-ink-900 px-4 py-3 text-ink-100 placeholder:text-ink-400 focus:border-mint-500 focus:outline-none"
        />

        <label className="mb-2 text-sm font-medium text-ink-100">성격</label>
        <div className="mb-6 flex flex-wrap gap-2">
          {PERSONALITY_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setPersonality(p)}
              className="transition"
            >
              <Pill tone={personality === p ? "mint" : "neutral"}>{p}</Pill>
            </button>
          ))}
        </div>

        <label className="mb-2 text-sm font-medium text-ink-100">관심사</label>
        <div className="mb-3 flex flex-wrap gap-2">
          {INTEREST_CHIPS.map((chip) => (
            <button key={chip} onClick={() => toggleInterest(chip)} className="transition">
              <Pill tone={interests.includes(chip) ? "mint" : "neutral"}>{chip}</Pill>
            </button>
          ))}
          {interests
            .filter((i) => !INTEREST_CHIPS.includes(i))
            .map((chip) => (
              <button key={chip} onClick={() => toggleInterest(chip)} className="transition">
                <Pill tone="mint">{chip}</Pill>
              </button>
            ))}
        </div>
        <div className="mb-8 flex gap-2">
          <input
            value={customInterest}
            onChange={(e) => setCustomInterest(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustomInterest();
              }
            }}
            placeholder="직접 입력"
            className="flex-1 rounded-xl border border-ink-700 bg-ink-900 px-4 py-2 text-sm text-ink-100 placeholder:text-ink-400 focus:border-mint-500 focus:outline-none"
          />
          <button
            onClick={addCustomInterest}
            className="rounded-xl border border-ink-700 px-4 text-sm text-ink-100 transition hover:border-mint-500"
          >
            추가
          </button>
        </div>

        <label className="mb-2 text-sm font-medium text-ink-100">목소리</label>
        <div className="mb-8 flex flex-col gap-2">
          {VOICE_OPTIONS.map((v) => (
            <button
              key={v.id}
              onClick={() => setVoiceId(v.id)}
              className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left transition ${
                voiceId === v.id
                  ? "border-mint-500 bg-ink-900"
                  : "border-ink-700 bg-ink-900/40 hover:border-ink-500"
              }`}
            >
              <span>
                <span className="block text-sm font-medium text-ink-100">{v.label}</span>
                <span className="block text-xs text-ink-400">{v.description}</span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  previewVoice(v.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    previewVoice(v.id);
                  }
                }}
                aria-label={`${v.label} 목소리 미리듣기`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ink-700 text-ink-100 transition hover:border-mint-500"
              >
                ▶
              </span>
            </button>
          ))}
        </div>

        {saveError && (
          <p className="mb-3 text-sm text-coral-400">{saveError}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="mt-auto w-full rounded-full bg-mint-500 py-4 text-sm font-semibold text-ink-950 transition hover:bg-mint-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "저장 중..." : "완료"}
        </button>
      </div>
    </PhoneShell>
  );
}
