import { NextResponse } from "next/server";
import { withDbRoute } from "@/lib/apiRoute";
import type { Report } from "@/lib/types";

export const GET = withDbRoute<{ params: Promise<{ id: string }> }>(
  "failed to load report",
  async ({ userId, sql, ctx }) => {
    const { id } = await ctx.params;
    const rows = await sql<{ data: Report }[]>`
      SELECT data FROM reports WHERE user_id = ${userId} AND id = ${id}
    `;
    return NextResponse.json(rows[0]?.data ?? null);
  }
);

/**
 * Deletes a report and everything derived from it: the underlying call
 * transcript (call_sessions), any expressions/sentences bookmarked from
 * it, and the vocabulary items captured from its corrections. Runs in one
 * transaction so a mid-way failure can't leave orphaned rows behind. The user asked for this specifically so past call content can't keep
 * influencing the AI going forward — chatJSON only ever sees the current
 * call's in-memory history (see src/app/api/converse/route.ts), so once the
 * row is gone here there's nowhere left it could be read from again.
 */
export const DELETE = withDbRoute<{ params: Promise<{ id: string }> }>(
  "failed to delete report",
  async ({ userId, sql, ctx }) => {
    const { id } = await ctx.params;
    await sql.begin(async (tx) => {
      const rows = await tx<{ call_session_id: string | null }[]>`
        SELECT call_session_id FROM reports WHERE user_id = ${userId} AND id = ${id}
      `;
      const callSessionId = rows[0]?.call_session_id;
      await tx`DELETE FROM archive_expressions WHERE user_id = ${userId} AND report_id = ${id}`;
      await tx`DELETE FROM archive_sentences WHERE user_id = ${userId} AND report_id = ${id}`;
      await tx`DELETE FROM vocabulary_items WHERE user_id = ${userId} AND report_id = ${id}`;
      await tx`DELETE FROM reports WHERE user_id = ${userId} AND id = ${id}`;
      if (callSessionId) {
        await tx`DELETE FROM call_sessions WHERE user_id = ${userId} AND id = ${callSessionId}`;
      }
    });
    return NextResponse.json({ ok: true });
  }
);
