import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Every /api/data/** route is per-user — this resolves the signed-in user's
 * stable key (fixed to "owner" under the passcode-login single-user setup,
 * see src/lib/auth.ts) or returns a 401 response to short-circuit with.
 * Usage: `const userId = await requireUser(); if (userId instanceof
 * NextResponse) return userId;`
 */
export async function requireUser(): Promise<string | NextResponse> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) {
    return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });
  }
  return id;
}
