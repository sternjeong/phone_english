import { NextRequest, NextResponse } from "next/server";
import { chatJSON, GeminiConfigError } from "@/lib/gemini";
import { ChatMessage, Persona, Topic } from "@/lib/types";

/**
 * Core call-loop endpoint. One round trip covers both things HeyRing does
 * live during a call (see docs/PROJECT_NOTES.md "통화 중 화면"):
 *  1. paraphrase-check the user's utterance ("👍 패러프레이징" vs a correction)
 *  2. generate the AI's next line, in English + Korean caption
 */

type ConverseRequest = {
  persona: Persona;
  topic: Topic;
  history: ChatMessage[];
  userUtterance: string;
};

type ConverseResponse = {
  paraphrase: { status: "approved" | "corrected"; corrected?: string; reason?: string };
  aiReply: { textEn: string; textKo: string };
};

const TOPIC_LABEL: Record<Topic, string> = {
  me: "나의 성격과 가치관을 알아보는 질문",
  career: "커리어에 대한 질문",
  relationships: "관계에 대한 질문",
  emotions: "감정에 대한 질문",
};

export async function POST(req: NextRequest) {
  const { persona, topic, history, userUtterance } = (await req.json()) as ConverseRequest;

  const systemPrompt = `You are ${persona.name}, a warm native-English-speaking phone friend calling a Korean English learner to practice conversation.
Personality: ${persona.personality}. Shared interests: ${persona.interests.join(", ")}.
Current topic focus: ${TOPIC_LABEL[topic]}.
Keep replies short (1-3 sentences), casual, and always end with something that invites the learner to keep talking.
Always respond ONLY as strict JSON matching this TypeScript type, no prose outside the JSON:
{
  "paraphrase": { "status": "approved" | "corrected", "corrected"?: string, "reason"?: string },
  "aiReply": { "textEn": string, "textKo": string }
}
For "paraphrase": if the learner's last line was already natural, set status "approved" and omit corrected/reason.
If it was awkward, unnatural, or grammatically off, set status "corrected", give a more native-sounding rewrite in "corrected", and a one-line Korean "reason" explaining the fix.
For "aiReply": continue the phone call naturally in character. "textKo" is a natural Korean translation of "textEn".`;

  const historyMessages = history.map((m) => ({
    role: (m.role === "ai" ? "model" : "user") as "model" | "user",
    content: m.textEn,
  }));

  try {
    const result = await chatJSON<ConverseResponse>(systemPrompt, [
      ...historyMessages,
      { role: "user", content: userUtterance },
    ]);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof GeminiConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "conversation generation failed" }, { status: 500 });
  }
}
