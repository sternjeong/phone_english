import { NextResponse } from "next/server";
import { withDbRoute } from "@/lib/apiRoute";
import type { CallSession } from "@/lib/types";

/**
 * Added so the report-detail screen can fetch the one session it needs
 * (via report.callSessionId) instead of listing every session the user has
 * ever had just to find one by id — mirrors reports/[id]/route.ts.
 */
export const GET = withDbRoute<{ params: Promise<{ id: string }> }>(
  "failed to load session",
  async ({ userId, sql, ctx }) => {
    const { id } = await ctx.params;
    const rows = await sql<{ data: CallSession }[]>`
      SELECT data FROM call_sessions WHERE user_id = ${userId} AND id = ${id}
    `;
    return NextResponse.json(rows[0]?.data ?? null);
  }
);
