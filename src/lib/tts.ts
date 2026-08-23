"use client";

/**
 * Shared TTS helper — picks a natural-sounding young-woman English voice
 * from whatever the browser exposes (no cloud TTS: that would add network
 * latency, which fights the "make responses faster" goal). Voice list
 * loads asynchronously in some browsers (notably Chrome), so we cache the
 * pick once resolved instead of re-querying on every utterance.
 */

// Ordered by how natural/pleasant they actually sound, not just "is
// female" — "Google US English" is the most universally-available female
// voice on Chrome but reads noticeably flat/robotic compared to the OS
// "enhanced"/"natural" voice packs below, so those are tried first and
// Google's is kept as the last-resort fallback rather than the default.
const PREFERRED_VOICE_NAMES = [
  "Microsoft Ava Online (Natural) - English (United States)",
  "Microsoft Emma Online (Natural) - English (United States)",
  "Microsoft Aria Online (Natural) - English (United States)",
  "Microsoft Jenny Online (Natural) - English (United States)",
  "Ava", // macOS "enhanced"/"premium" voice pack
  "Allison", // macOS "enhanced"/"premium" voice pack
  "Samantha", // macOS / iOS Safari default — solid, natural
  "Google UK English Female",
  "Microsoft Zira Desktop - English (United States)",
  "Google US English", // Chrome desktop fallback — female, but flatter-sounding
];

const FEMALE_NAME_HINTS = [
  "female",
  "woman",
  "zira",
  "samantha",
  "aria",
  "jenny",
  "susan",
  "victoria",
  "karen",
  "moira",
  "tessa",
  "fiona",
  "salli",
  "joanna",
  "kimberly",
  "amy",
  "emma",
  "ava",
];

const MALE_NAME_HINTS = ["male", "david", "mark", "daniel", "alex", "fred", "tom", "guy", "james"];

let cachedVoice: SpeechSynthesisVoice | null | undefined;

function pickFemaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  for (const name of PREFERRED_VOICE_NAMES) {
    const exact = voices.find((v) => v.name === name);
    if (exact) return exact;
  }
  const enVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const hinted = enVoices.find((v) =>
    FEMALE_NAME_HINTS.some((h) => v.name.toLowerCase().includes(h))
  );
  if (hinted) return hinted;
  const nonMale = enVoices.find(
    (v) => !MALE_NAME_HINTS.some((h) => v.name.toLowerCase().includes(h))
  );
  return nonMale ?? enVoices[0] ?? voices[0] ?? null;
}

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = window.speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    // Chrome loads the voice list asynchronously the first time.
    const onChange = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener("voiceschanged", onChange);
    // Some browsers never fire voiceschanged (or already have a short list) —
    // don't block speech forever waiting for a better voice.
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", onChange);
      resolve(window.speechSynthesis.getVoices());
    }, 400);
  });
}

async function getFemaleVoice(): Promise<SpeechSynthesisVoice | null> {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = await loadVoices();
  if (voices.length === 0) {
    // Some environments (bare Linux desktops without a speech engine
    // installed, some embedded webviews) expose the Web Speech API but
    // have zero actual voices — speak() will then silently do nothing.
    // Nothing we can do about that from here, but worth surfacing.
    console.warn(
      "[tts] speechSynthesis reports 0 voices — this browser/OS has no TTS engine available, so AI replies will be silent."
    );
  }
  cachedVoice = pickFemaleVoice(voices);
  return cachedVoice;
}

/**
 * Call once when a call screen mounts so the (up to ~400ms) voice-list
 * lookup happens while the greeting is still in flight over the network,
 * instead of stacking on top of it the first time speakText() runs.
 */
export function preloadVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  void getFemaleVoice();
}

/**
 * Mobile Chrome (Android) and Safari (iOS) are both stricter than desktop
 * about *when* they're allowed to speak at all: `speechSynthesis.speak()`
 * only works reliably once it's been called directly inside a user
 * gesture's event handler (tap/click) at least once — every subsequent
 * call, even from an async context (like a network response arriving),
 * then works for the rest of the page's lifetime. Without this "unlock",
 * speak() silently does nothing (confirmed live: worked on desktop, dead
 * silent on iPhone Safari; then a second report of the same symptom on
 * Android Chrome). Call this synchronously inside a tap handler, before
 * any `await`. Deliberately callable more than once (no "only once" guard)
 * — it's cheap and near-silent, and different mobile browsers have been
 * observed wanting the unlock repeated per-gesture rather than once ever.
 */
export function unlockSpeechSynthesis() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.resume(); // Android Chrome can leave the engine "paused"
    const utter = new SpeechSynthesisUtterance(" ");
    utter.volume = 0.01; // effectively silent — this call exists purely to unlock, not to be heard
    window.speechSynthesis.speak(utter);
  } catch {
    // best-effort
  }
}

function buildUtterance(text: string, voice: SpeechSynthesisVoice | null) {
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  if (voice) utter.voice = voice;
  // 1.15 read as an exaggerated, slightly chipmunk-y pitch rather than
  // "pretty" — a much smaller lift plus a touch slower than normal speed
  // reads as warmer/more natural instead.
  utter.pitch = 1.05;
  utter.rate = 0.97;
  return utter;
}

function speakNow(text: string, voice: SpeechSynthesisVoice | null) {
  const synth = window.speechSynthesis;
  const utter = buildUtterance(text, voice);
  // Android Chrome has a long-standing bug where calling cancel()
  // immediately before speak() can drop the new utterance entirely —
  // only cancel when something is actually queued/playing, and push the
  // speak() call to the next tick so Android's engine has a moment to
  // actually finish clearing the queue first.
  if (synth.speaking || synth.pending) {
    synth.cancel();
    setTimeout(() => {
      synth.resume();
      synth.speak(utter);
    }, 60);
  } else {
    synth.resume();
    synth.speak(utter);
  }
}

/**
 * Speaks `text` in a young-woman English voice. Fire-and-forget; failures
 * are silent (TTS is cosmetic, never blocks the call).
 *
 * Deliberately NOT an `async function` — some browsers (notably Safari/
 * iOS) only allow `speechSynthesis.speak()` to fire reliably when it's
 * still inside the same call stack as whatever triggered it; `await`-ing
 * anything first (even something that resolves instantly) yields to the
 * microtask queue and can silently drop the utterance. Since
 * `preloadVoice()` is called on call-mount, the voice is normally already
 * cached by the time any reply comes in, so we speak synchronously in that
 * case and only fall back to the async path before the cache is warm.
 */
export function speakText(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    if (cachedVoice !== undefined) {
      speakNow(text, cachedVoice);
      return;
    }
    getFemaleVoice()
      .then((voice) => speakNow(text, voice))
      .catch(() => {
        // best-effort — TTS failure shouldn't break the call flow
      });
  } catch {
    // best-effort — TTS failure shouldn't break the call flow
  }
}
