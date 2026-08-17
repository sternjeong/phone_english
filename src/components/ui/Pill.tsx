import { ReactNode } from "react";

type PillTone = "neutral" | "mint" | "amber" | "coral" | "solid";

const toneClasses: Record<PillTone, string> = {
  neutral: "bg-ink-800 text-ink-100 border border-ink-700",
  mint: "bg-mint-500/15 text-mint-500 border border-mint-500/30",
  amber: "bg-amber-400/15 text-amber-400 border border-amber-400/30",
  coral: "bg-coral-400/15 text-coral-400 border border-coral-400/30",
  solid: "bg-ink-100 text-ink-950",
};

export function Pill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: PillTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${toneClasses[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
