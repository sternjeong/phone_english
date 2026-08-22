import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { db, ensureSchema, DbConfigError } from "@/lib/db";

type Sql = ReturnType<typeof db>;

/**
 * Every /api/data/** handler repeated the same shape: resolve the user (or
 * 401), ensure the schema exists, get a `sql` client, and map DbConfigError
 * → 501 / anything else → 500. This collapses that into one place so each
 * route file only has to write its actual query.
 */
export function withDbRoute<Ctx = unknown>(
  errorMessage: string,
  handler: (args: { userId: string; sql: Sql; req: NextRequest; ctx: Ctx }) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: Ctx) => {
    const userId = await requireUser();
    if (userId instanceof NextResponse) return userId;
    try {
      await ensureSchema();
      const sql = db();
      return await handler({ userId, sql, req, ctx });
    } catch (err) {
      if (err instanceof DbConfigError) {
        return NextResponse.json({ error: err.message }, { status: 501 });
      }
      console.error(err);
      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  };
}
