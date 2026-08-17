import { PhoneShell } from "@/components/ui/PhoneShell";

/**
 * Loading state for /reports — paper tone to match the report list screen,
 * shown while the route segment mounts (report list reads from
 * localStorage on the client, which can otherwise flash blank).
 */
export default function ReportsLoading() {
  return (
    <PhoneShell tone="paper">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-paper-200 border-t-paper-900" />
        <p className="text-sm text-paper-600">불러오는 중…</p>
      </div>
    </PhoneShell>
  );
}
