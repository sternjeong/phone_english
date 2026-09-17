import { NextResponse } from "next/server";
import { withDbRoute } from "@/lib/apiRoute";
import type { VocabularyItem } from "@/lib/types";

type Params = { params: Promise<{ id: string }> };

export const PUT = withDbRoute<Params>("failed to update vocabulary", async ({ userId, sql, req, ctx }) => {
  const { id } = await ctx.params;
  const item = (await req.json()) as VocabularyItem;
  await sql`
    UPDATE vocabulary_items SET data = ${sql.json(item)} WHERE id = ${id} AND user_id = ${userId}
  `;
  return NextResponse.json({ ok: true });
});

export const DELETE = withDbRoute<Params>("failed to delete vocabulary", async ({ userId, sql, ctx }) => {
  const { id } = await ctx.params;
  await sql`DELETE FROM vocabulary_items WHERE id = ${id} AND user_id = ${userId}`;
  return NextResponse.json({ ok: true });
});
