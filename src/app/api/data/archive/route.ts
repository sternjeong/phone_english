import { NextResponse } from "next/server";
import { withDbRoute } from "@/lib/apiRoute";
import type { BookmarkedExpression, BookmarkedSentence } from "@/lib/archive";
import type { Expression } from "@/lib/types";

export const GET = withDbRoute("failed to load archive", async ({ userId, sql }) => {
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
});

type ToggleBody =
  | { kind: "expression"; expression: Expression; reportId: string }
  | { kind: "sentence"; sentence: Omit<BookmarkedSentence, "bookmarkedAt"> };

/** Toggles a bookmark on/off; returns { bookmarked: boolean }. */
export const POST = withDbRoute("failed to toggle bookmark", async ({ userId, sql, req }) => {
  const body = (await req.json()) as ToggleBody;

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
});
