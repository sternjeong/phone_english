import { NextResponse } from "next/server";
import { withDbRoute } from "@/lib/apiRoute";
import type { Persona } from "@/lib/types";

export const GET = withDbRoute("failed to load persona", async ({ userId, sql }) => {
  const rows = await sql<{ data: Persona }[]>`
    SELECT data FROM personas WHERE user_id = ${userId}
  `;
  return NextResponse.json(rows[0]?.data ?? null);
});

export const PUT = withDbRoute("failed to save persona", async ({ userId, sql, req }) => {
  const persona = (await req.json()) as Persona;
  await sql`
    INSERT INTO personas (user_id, data, updated_at)
    VALUES (${userId}, ${sql.json(persona)}, now())
    ON CONFLICT (user_id) DO UPDATE SET data = ${sql.json(persona)}, updated_at = now()
  `;
  return NextResponse.json({ ok: true });
});
