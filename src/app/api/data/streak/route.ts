import { NextResponse } from "next/server";
import { withDbRoute } from "@/lib/apiRoute";

export const GET = withDbRoute("failed to load streak", async ({ userId, sql }) => {
  const rows = await sql<{ date: string; words: number }[]>`
    SELECT date, words FROM word_streak WHERE user_id = ${userId}
  `;
  const streak: Record<string, number> = {};
  for (const r of rows) streak[r.date] = r.words;
  return NextResponse.json(streak);
});

export const POST = withDbRoute("failed to save streak", async ({ userId, sql, req }) => {
  const { words, date } = (await req.json()) as { words: number; date: string };
  await sql`
    INSERT INTO word_streak (user_id, date, words)
    VALUES (${userId}, ${date}, ${words})
    ON CONFLICT (user_id, date) DO UPDATE SET words = word_streak.words + ${words}
  `;
  return NextResponse.json({ ok: true });
});
