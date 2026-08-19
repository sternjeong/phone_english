import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/apiAuth";
import { db, ensureSchema, DbConfigError } from "@/lib/db";
import type { Persona } from "@/lib/types";

export async function GET() {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  try {
    await ensureSchema();
    const sql = db();
    const rows = await sql<{ data: Persona }[]>`
      SELECT data FROM personas WHERE user_id = ${userId}
    `;
    return NextResponse.json(rows[0]?.data ?? null);
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to load persona" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const userId = await requireUser();
  if (userId instanceof NextResponse) return userId;
  const persona = (await req.json()) as Persona;
  try {
    await ensureSchema();
    const sql = db();
    await sql`
      INSERT INTO personas (user_id, data, updated_at)
      VALUES (${userId}, ${sql.json(persona)}, now())
      ON CONFLICT (user_id) DO UPDATE SET data = ${sql.json(persona)}, updated_at = now()
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DbConfigError) {
      return NextResponse.json({ error: err.message }, { status: 501 });
    }
    console.error(err);
    return NextResponse.json({ error: "failed to save persona" }, { status: 500 });
  }
}
