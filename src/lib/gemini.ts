/**
 * Minimal Gemini (Google AI Studio) REST wrapper — no SDK dependency, just
 * fetch. The user adds GEMINI_API_KEY (and optionally GEMINI_API_KEY_2) to
 * .env.local themselves (see docs/PROJECT_NOTES.md). Server-side only:
 * never import from a client component (keys would leak into the bundle).
 */

export class GeminiConfigError extends Error {}

type Role = "user" | "model";
type ChatTurn = { role: Role; content: string };

/**
 * The free tier's generate-content quota is per API key AND per model, not
 * shared — confirmed via curl:
 *  - gemini-3.6-flash hit its 20/day limit on the primary key while
 *    gemini-3.5-flash / gemini-3-flash-preview / gemini-3.1-flash-lite were
 *    all still available on that same key (separate per-model buckets).
 *  - A second API key the user provided succeeded on gemini-3.6-flash even
 *    while the primary key was fully exhausted on it (separate project,
 *    separate quota entirely — not just a different model).
 * So the fallback tries every (model, key) pair before giving up, ordered
 * to exhaust the best model across all keys before degrading to a weaker
 * model — maximizes reply quality for as long as quota allows, and only
 * trades down when every key is out on that model.
 *
 * Each model also disables "thinking" (the extra reasoning pass that adds
 * most of the latency for what's meant to be quick small talk) differently
 * — some only accept the newer `thinkingConfig.thinkingLevel` enum
 * ("MINIMAL"/"LOW", not "OFF"/"NONE"; `thinkingBudget` 400s on these),
 * others take the more familiar `thinkingConfig.thinkingBudget: 0`. Both
 * were empirically verified via curl to drop thoughtsTokenCount to 0.
 */
const MODEL_CANDIDATES: { name: string; thinkingConfig: Record<string, unknown> }[] = [
  { name: "gemini-3.6-flash", thinkingConfig: { thinkingLevel: "MINIMAL" } },
  { name: "gemini-3.5-flash", thinkingConfig: { thinkingBudget: 0 } },
  { name: "gemini-3-flash-preview", thinkingConfig: { thinkingBudget: 0 } },
  { name: "gemini-3.1-flash-lite", thinkingConfig: { thinkingBudget: 0 } },
];

// Even with "thinking" off, raw response time from Gemini varies wildly
// under load — measured 1.5s / 5.4s / 20.7s across three identical calls
// to the same (model, key) via curl. A 429/503 comes back fast on its own,
// but a *slow-but-would-eventually-succeed* request needs an explicit
// per-attempt timeout, or one unlucky attempt can eat the whole budget.
const ATTEMPT_TIMEOUT_MS = 4500;
// Hard ceiling on total time spent across every (model, key) attempt —
// after this, stop trying and surface the error so the existing "다시
// 시도" retry UI (call/page.tsx, MessageBubble) takes over instead of the
// user staring at a spinner indefinitely.
const OVERALL_DEADLINE_MS = 11000;

function orderedModels(): { name: string; thinkingConfig: Record<string, unknown> }[] {
  const preferred = process.env.GEMINI_MODEL;
  if (!preferred) return MODEL_CANDIDATES;
  const match = MODEL_CANDIDATES.find((m) => m.name === preferred);
  const rest = MODEL_CANDIDATES.filter((m) => m.name !== preferred);
  // Unknown env override: try it first (thinkingBudget is the more common
  // API shape), then fall back through the known-good list either way.
  return match ? [match, ...rest] : [{ name: preferred, thinkingConfig: { thinkingBudget: 0 } }, ...rest];
}

function apiKeys(): string[] {
  return [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_2].filter(
    (k): k is string => !!k
  );
}

/** Quota exhaustion (429) or transient overload (503) — worth trying the next model/key. */
function shouldFailover(status: number) {
  return status === 429 || status === 503;
}

async function fetchWithTimeout(
  url: string,
  apiKey: string,
  body: unknown,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      // Header rather than `?key=` so the key never ends up in URL logs.
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

type ChatOptions = {
  // Live call replies are 1-3 short sentences, so the default ceiling is
  // small — it stops the model from ever generating (and us waiting on) a
  // long tail. The post-call report returns several expressions plus
  // memory facts and needs far more room, or its JSON gets cut off
  // mid-string and fails to parse.
  maxOutputTokens?: number;
  attemptTimeoutMs?: number;
  overallDeadlineMs?: number;
};

/**
 * `systemPrompt` becomes Gemini's systemInstruction. `history` becomes the
 * contents array. Response is forced to JSON via responseMimeType, matching
 * the JSON-object contract our API routes rely on.
 */
export async function chatJSON<T>(
  systemPrompt: string,
  history: ChatTurn[],
  {
    maxOutputTokens = 240,
    attemptTimeoutMs = ATTEMPT_TIMEOUT_MS,
    overallDeadlineMs = OVERALL_DEADLINE_MS,
  }: ChatOptions = {}
): Promise<T> {
  const keys = apiKeys();
  if (keys.length === 0) {
    throw new GeminiConfigError(
      "GEMINI_API_KEY is not set. Add it to .env.local (see docs/PROJECT_NOTES.md)."
    );
  }

  const models = orderedModels();
  let lastError: Error | null = null;
  const deadline = Date.now() + overallDeadlineMs;

  outer: for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent`;
    for (const apiKey of keys) {
      if (Date.now() >= deadline) break outer;

      let res: Response;
      try {
        res = await fetchWithTimeout(
          url,
          apiKey,
          {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: history.map((t) => ({ role: t.role, parts: [{ text: t.content }] })),
            generationConfig: {
              temperature: 0.8,
              responseMimeType: "application/json",
              thinkingConfig: model.thinkingConfig,
              maxOutputTokens,
            },
          },
          Math.max(1000, Math.min(attemptTimeoutMs, deadline - Date.now()))
        );
      } catch (err) {
        // AbortError (our own timeout) or a network failure — either way,
        // this (model, key) pair was too slow/unreachable, try the next.
        lastError = err instanceof Error ? err : new Error(String(err));
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        lastError = new Error(`Gemini request failed on ${model.name} (${res.status}): ${body}`);
        if (shouldFailover(res.status)) continue;
        throw lastError;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        lastError = new Error(`Gemini returned no content from ${model.name}`);
        continue;
      }
      try {
        return JSON.parse(text) as T;
      } catch {
        // Truncated (MAX_TOKENS) or otherwise malformed JSON — another
        // model/key may well produce a valid response, so keep going.
        lastError = new Error(`Gemini returned invalid JSON from ${model.name}`);
        continue;
      }
    }
  }

  throw lastError ?? new Error("Gemini request failed on all candidate models/keys");
}
