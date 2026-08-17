import { PhoneShell } from "@/components/ui/PhoneShell";

/**
 * Loading state for /call — ink tone to match the incoming-call / in-call
 * screen, shown while the route segment mounts (call setup reads persona
 * state from localStorage on the client, which can otherwise flash blank).
 */
export default function CallLoading() {
  return (
    <PhoneShell tone="ink">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-800 border-t-mint-500" />
        <p className="text-sm text-ink-400">연결 중…</p>
      </div>
    </PhoneShell>
  );
}
