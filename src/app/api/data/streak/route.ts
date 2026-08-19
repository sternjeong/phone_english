import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { db, ensureSchema, DbConfigError } from "@/lib/db";

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  try {
    await ensureSchema();
    const sql = db();
    const rows = await sql<{ date: string; words: number }[]>`
      SELECT date, words FROM word_streak WHERE user_id = ${userId}
    `;
    const streak: Record<string, number> = {};
    for (const r of rows) streak[r.date] = r.words;
    return NextResponse.json(streak);
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to load streak" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  const { words, date } = (await req.json()) as { words: number; date: string };
  try {
    await ensureSchema();
    const sql = db();
    await sql`
      INSERT INTO word_streak (user_id, date, words)
      VALUES (${userId}, ${date}, ${words})
      ON CONFLICT (user_id, date) DO UPDATE SET words = word_streak.words + ${words}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to save streak" }, { status: 500 });
  }
}
