import { NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { db, ensureSchema, DbConfigError } from "@/lib/db";
import type { Report } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  const { id } = await params;
  try {
    await ensureSchema();
    const sql = db();
    const rows = await sql<{ data: Report }[]>`
      SELECT data FROM reports WHERE user_id = ${userId} AND id = ${id}
    `;
    return NextResponse.json(rows[0]?.data ?? null);
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to load report" }, { status: 500 });
  }
}
