"use client";

import { useEffect } from "react";

/**
 * Root-level error boundary. Only used when an error occurs in the root
 * layout itself (rare — error.tsx handles everything else), so per the
 * Next.js App Router convention this must render its own <html>/<body>,
 * replacing the root layout entirely. Kept dependency-free (no PhoneShell /
 * Tailwind tokens assumed) since this is the last line of defense.
 */
export default function GlobalError({
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
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#f5f5f5",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            문제가 생겼어요
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#a3a3a3", marginBottom: "1.5rem" }}>
            앱을 불러오는 중 오류가 발생했어요. 잠시 후 다시 시도해주세요.
          </p>
          <button
            onClick={() => reset()}
            style={{
              borderRadius: "9999px",
              background: "#35d68c",
              color: "#0a0a0a",
              fontWeight: 600,
              fontSize: "0.875rem",
              padding: "0.75rem 1.5rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
