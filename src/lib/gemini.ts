/**
 * Minimal Gemini (Google AI Studio) REST wrapper — no SDK dependency, just
 * fetch. The user adds GEMINI_API_KEY to .env.local themselves (see
 * docs/PROJECT_NOTES.md). Server-side only: never import from a client
 * component (the key would leak into the bundle).
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiConfigError extends Error {}

type Role = "user" | "model";
type ChatTurn = { role: Role; content: string };

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

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: history.map((t) => ({ role: t.role, parts: [{ text: t.content }] })),
      generationConfig: {
        temperature: 0.8,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini request failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no content");
  return JSON.parse(text) as T;
}
