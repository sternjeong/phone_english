"use client";

import type { ReactNode } from "react";

/**
 * Shared full-screen overlay wrapper — `TopicDial` and the call-extension
 * prompt in `src/app/call/page.tsx` both need "cover the phone screen,
 * center content" and had grown their own copies of the same
 * `absolute inset-0 z-* flex items-center justify-center` shell. Pass
 * z-index, background, and layout tweaks via `className`.
 */
export function Backdrop({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <div className={`absolute inset-0 flex items-center justify-center ${className}`} onClick={onClick}>
      {children}
    </div>
  );
}
