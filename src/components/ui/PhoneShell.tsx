import { ReactNode } from "react";

/**
 * HeyRing is a mobile app; we're rebuilding it as a web app. On anything
 * wider than a phone we still want the experience to read as "a phone
 * screen", so every top-level route wraps its content in this shell instead
 * of stretching full-bleed across a desktop browser.
 */
export function PhoneShell({
  children,
  tone = "ink",
  className = "",
}: {
  children: ReactNode;
  tone?: "ink" | "paper";
  className?: string;
}) {
  const toneClass =
    tone === "ink" ? "bg-ink-950 text-ink-100" : "bg-paper-50 text-paper-900";

  return (
    <div className="min-h-dvh w-full flex justify-center bg-ink-950 sm:py-6">
      <div
        className={`relative flex h-dvh w-full max-w-[430px] flex-col overflow-hidden sm:h-[calc(100dvh-3rem)] sm:rounded-[2.5rem] sm:border sm:border-ink-800 sm:shadow-2xl ${toneClass} ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
