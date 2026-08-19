import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { db, ensureSchema, DbConfigError } from "@/lib/db";
import type { Report } from "@/lib/types";

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  try {
    await ensureSchema();
    const sql = db();
    const rows = await sql<{ data: Report }[]>`
      SELECT data FROM reports WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    return NextResponse.json(rows.map((r) => r.data));
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to load reports" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  const report = (await req.json()) as Report;
  try {
    await ensureSchema();
    const sql = db();
    await sql`
      INSERT INTO reports (id, user_id, call_session_id, data)
      VALUES (${report.id}, ${userId}, ${report.callSessionId}, ${sql.json(report)})
      ON CONFLICT (id) DO UPDATE SET data = ${sql.json(report)}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to save report" }, { status: 500 });
  }
}
