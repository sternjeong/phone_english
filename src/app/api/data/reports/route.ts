import { NextResponse } from "next/server";
import { withDbRoute } from "@/lib/apiRoute";
import type { Report } from "@/lib/types";

export const GET = withDbRoute("failed to load reports", async ({ userId, sql }) => {
  const rows = await sql<{ data: Report }[]>`
    SELECT data FROM reports WHERE user_id = ${userId} ORDER BY created_at DESC
  `;
  return NextResponse.json(rows.map((r) => r.data));
});

export const POST = withDbRoute("failed to save report", async ({ userId, sql, req }) => {
  const report = (await req.json()) as Report;
  await sql`
    INSERT INTO reports (id, user_id, call_session_id, data)
    VALUES (${report.id}, ${userId}, ${report.callSessionId}, ${sql.json(report)})
    ON CONFLICT (id) DO UPDATE SET data = ${sql.json(report)}
  `;
  return NextResponse.json({ ok: true });
});
