import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { db, ensureSchema, DbConfigError } from "@/lib/db";
import type { BookmarkedExpression, BookmarkedSentence } from "@/lib/archive";
import type { Expression } from "@/lib/types";

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  try {
    await ensureSchema();
    const sql = db();
    const [expressions, sentences] = await Promise.all([
      sql<{ data: BookmarkedExpression }[]>`
        SELECT data FROM archive_expressions WHERE user_id = ${userId} ORDER BY created_at DESC
      `,
      sql<{ data: BookmarkedSentence }[]>`
        SELECT data FROM archive_sentences WHERE user_id = ${userId} ORDER BY created_at DESC
      `,
    ]);
    return NextResponse.json({
      expressions: expressions.map((r) => r.data),
      sentences: sentences.map((r) => r.data),
    });
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to load archive" }, { status: 500 });
  }
}

type ToggleBody =
  | { kind: "expression"; expression: Expression; reportId: string }
  | { kind: "sentence"; sentence: Omit<BookmarkedSentence, "bookmarkedAt"> };

/** Toggles a bookmark on/off; returns { bookmarked: boolean }. */
export async function POST(req: NextRequest) {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  const body = (await req.json()) as ToggleBody;

  try {
    await ensureSchema();
    const sql = db();

    if (body.kind === "expression") {
      const { expression, reportId } = body;
      const existing = await sql`
        SELECT id FROM archive_expressions WHERE user_id = ${userId} AND id = ${expression.id}
      `;
      if (existing.length > 0) {
        await sql`DELETE FROM archive_expressions WHERE user_id = ${userId} AND id = ${expression.id}`;
        return NextResponse.json({ bookmarked: false });
      }
      const bookmarked: BookmarkedExpression = {
        ...expression,
        reportId,
        bookmarkedAt: Date.now(),
      };
      await sql`
        INSERT INTO archive_expressions (id, user_id, report_id, data)
        VALUES (${expression.id}, ${userId}, ${reportId}, ${sql.json(bookmarked)})
      `;
      return NextResponse.json({ bookmarked: true });
    }

    const { sentence } = body;
    const existing = await sql`
      SELECT id FROM archive_sentences WHERE user_id = ${userId} AND id = ${sentence.id}
    `;
    if (existing.length > 0) {
      await sql`DELETE FROM archive_sentences WHERE user_id = ${userId} AND id = ${sentence.id}`;
      return NextResponse.json({ bookmarked: false });
    }
    const bookmarked: BookmarkedSentence = { ...sentence, bookmarkedAt: Date.now() };
    await sql`
      INSERT INTO archive_sentences (id, user_id, report_id, data)
      VALUES (${sentence.id}, ${userId}, ${sentence.reportId}, ${sql.json(bookmarked)})
    `;
    return NextResponse.json({ bookmarked: true });
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to toggle bookmark" }, { status: 500 });
  }
}
