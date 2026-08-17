import { PhoneShell } from "@/components/ui/PhoneShell";

/**
 * Loading state for /reports/[id] — ink tone to match the report detail
 * screen, shown while the route segment mounts (report detail reads from
 * localStorage on the client, which can otherwise flash blank).
 */
export default function ReportDetailLoading() {
  return (
    <PhoneShell tone="ink">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ink-800 border-t-mint-500" />
        <p className="text-sm text-ink-400">불러오는 중…</p>
      </div>
    </PhoneShell>
  );
}
