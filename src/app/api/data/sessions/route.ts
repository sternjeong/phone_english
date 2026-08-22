import { NextResponse } from "next/server";
import { withDbRoute } from "@/lib/apiRoute";
import type { CallSession } from "@/lib/types";

export const GET = withDbRoute("failed to load sessions", async ({ userId, sql }) => {
  const rows = await sql<{ data: CallSession }[]>`
    SELECT data FROM call_sessions WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return NextResponse.json(rows.map((r) => r.data));
});

export const POST = withDbRoute("failed to save session", async ({ userId, sql, req }) => {
  const session = (await req.json()) as CallSession;
  await sql`
    INSERT INTO call_sessions (id, user_id, data)
    VALUES (${session.id}, ${userId}, ${sql.json(session)})
    ON CONFLICT (id) DO UPDATE SET data = ${sql.json(session)}
  `;
  return NextResponse.json({ ok: true });
});
