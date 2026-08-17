import { NextRequest, NextResponse } from "next/server";
import { chatJSON, GeminiConfigError } from "@/lib/gemini";
import { ChatMessage, Expression } from "@/lib/types";

/**
 * Post-call report generation (docs/PROJECT_NOTES.md "리포트 상세").
 * Pronunciation/prosody/fluency % in the real app come from audio analysis
 * we don't have (Web Speech API gives no confidence scores) — this route
 * only produces the title + native-expression carousel from the transcript.
 * The numeric scores are generated client-side as an MVP-simplified
 * heuristic; see the practice/report screens for that.
 */

type ReportRequest = { messages: ChatMessage[] };
type ReportResponse = { title: string; expressions: Expression[] };

export async function POST(req: NextRequest) {
  const { messages } = (await req.json()) as ReportRequest;
  const transcript = messages
    .map((m) => `${m.role === "ai" ? "AI" : "USER"}: ${m.textEn}`)
    .join("\n");

  const systemPrompt = `You summarize a phone-call English practice session transcript for a Korean learner.
Return ONLY strict JSON matching this TypeScript type:
{
  "title": string,        // a short, warm Korean title describing what the call was about, like "군대 동기와의 솔직한 대화"
  "expressions": {
    "id": string,
    "phrase": string,       // a short native English phrase worth learning from this call
    "meaningKo": string,    // its Korean meaning
    "exampleEn": string,    // an example sentence using it (can reuse/adapt something from the transcript)
    "exampleKo": string,    // Korean translation of the example
    "highlight": string     // the exact substring of exampleEn to highlight (the phrase itself as it appears in exampleEn)
  }[]                        // 3 to 7 expressions, drawn from what the USER actually struggled with or could upgrade
}`;

  try {
    const result = await chatJSON<ReportResponse>(systemPrompt, [
      { role: "user", content: transcript || "(empty call)" },
    ]);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "report generation failed" }, { status: 500 });
  }
}
