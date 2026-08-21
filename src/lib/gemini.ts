/**
 * Minimal Gemini (Google AI Studio) REST wrapper — no SDK dependency, just
 * fetch. The user adds GEMINI_API_KEY to .env.local themselves (see
 * docs/PROJECT_NOTES.md). Server-side only: never import from a client
 * component (the key would leak into the bundle).
 */

export class GeminiConfigError extends Error {}

type Role = "user" | "model";
type ChatTurn = { role: Role; content: string };

/**
 * The free tier's generate-content quota is per model, not per project
 * (confirmed via curl: hit "GenerateRequestsPerDayPerProjectPerModel-
 * FreeTier, limit: 20" on gemini-3.6-flash while gemini-3.5-flash,
 * gemini-3-flash-preview, and gemini-3.1-flash-lite all still worked fine
 * on the same key). So instead of one fixed model, we try a short list in
 * order and fail over to the next one on quota/overload errors — this
 * multiplies the effective daily budget by the number of models below.
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

function orderedModels(): { name: string; thinkingConfig: Record<string, unknown> }[] {
  const preferred = process.env.GEMINI_MODEL;
  if (!preferred) return MODEL_CANDIDATES;
  const match = MODEL_CANDIDATES.find((m) => m.name === preferred);
  const rest = MODEL_CANDIDATES.filter((m) => m.name !== preferred);
  // Unknown env override: try it first (thinkingBudget is the more common
  // API shape), then fall back through the known-good list either way.
  return match ? [match, ...rest] : [{ name: preferred, thinkingConfig: { thinkingBudget: 0 } }, ...rest];
}

/** Quota exhaustion (429) or transient overload (503) — worth trying the next model. */
function shouldFailover(status: number) {
  return status === 429 || status === 503;
}

/**
 * `systemPrompt` becomes Gemini's systemInstruction. `history` + `latest`
 * become the contents array. Response is forced to JSON via
 * responseMimeType, matching the JSON-object contract our API routes rely
 * on (mirrors how src/lib/openai.ts used to work, so callers don't change).
 */
export async function chatJSON<T>(systemPrompt: string, history: ChatTurn[]): Promise<T> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiConfigError(
      "GEMINI_API_KEY is not set. Add it to .env.local (see docs/PROJECT_NOTES.md)."
    );
  }

  const candidates = orderedModels();
  let lastError: Error | null = null;

  for (const model of candidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent`;
    let res: Response;
    try {
      res = await fetch(`${url}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: history.map((t) => ({ role: t.role, parts: [{ text: t.content }] })),
          generationConfig: {
            temperature: 0.8,
            responseMimeType: "application/json",
            thinkingConfig: model.thinkingConfig,
            // Replies are meant to be 1-3 short sentences — a small ceiling
            // stops the model from ever generating (and us waiting on) a
            // long tail response.
            maxOutputTokens: 400,
          },
        }),
      });
    } catch (err) {
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
    return JSON.parse(text) as T;
  }

  throw lastError ?? new Error("Gemini request failed on all candidate models");
}
