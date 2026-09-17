import { NextResponse } from "next/server";
import { withDbRoute } from "@/lib/apiRoute";
import type { VocabularyItem } from "@/lib/types";

export const GET = withDbRoute("failed to load vocabulary", async ({ userId, sql }) => {
  const rows = await sql<{ data: VocabularyItem }[]>`
    SELECT data FROM vocabulary_items WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return NextResponse.json(rows.map((row) => row.data));
});

export const POST = withDbRoute("failed to save vocabulary", async ({ userId, sql, req }) => {
  const { items } = (await req.json()) as { items: VocabularyItem[] };
  for (const item of items) {
    await sql`
      INSERT INTO vocabulary_items (id, user_id, report_id, data)
      VALUES (${item.id}, ${userId}, ${item.reportId}, ${sql.json(item)})
      ON CONFLICT (id) DO UPDATE SET data = ${sql.json(item)}
    `;
  }
  return NextResponse.json({ ok: true });
});
