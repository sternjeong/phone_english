"use client";

import Link from "next/link";
import { useEffect } from "react";
import { PhoneShell } from "@/components/ui/PhoneShell";

/**
 * Route-level client error boundary (Next.js App Router convention: must be
 * a client component receiving { error, reset }). Catches errors thrown
 * while rendering any route below the root layout. Ink tone to match the
 * app's dominant black-screen palette.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PhoneShell tone="ink">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl">⚠️</span>
        <h1 className="text-xl font-bold text-ink-100">문제가 생겼어요</h1>
        <p className="text-sm text-ink-400">
          잠시 후 다시 시도해주세요.
        </p>
        <div className="mt-2 flex gap-3">
          <button
            onClick={() => reset()}
            className="rounded-full bg-mint-500 px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-600"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="rounded-full border border-ink-700 px-6 py-3 text-sm font-semibold text-ink-100 transition hover:bg-ink-800"
          >
            홈으로 가기
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
