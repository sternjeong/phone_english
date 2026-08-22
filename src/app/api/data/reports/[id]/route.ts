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
