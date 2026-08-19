import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { db, ensureSchema, DbConfigError } from "@/lib/db";
import type { CallSession } from "@/lib/types";

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  try {
    await ensureSchema();
    const sql = db();
    const rows = await sql<{ data: CallSession }[]>`
      SELECT data FROM call_sessions WHERE user_id = ${userId} ORDER BY created_at DESC
    `;
    return NextResponse.json(rows.map((r) => r.data));
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to load sessions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  const session = (await req.json()) as CallSession;
  try {
    await ensureSchema();
    const sql = db();
    await sql`
      INSERT INTO call_sessions (id, user_id, data)
      VALUES (${session.id}, ${userId}, ${sql.json(session)})
      ON CONFLICT (id) DO UPDATE SET data = ${sql.json(session)}
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to save session" }, { status: 500 });
  }
}
