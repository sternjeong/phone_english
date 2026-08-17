import Link from "next/link";
import { PhoneShell } from "@/components/ui/PhoneShell";

/**
 * Global 404. Ink (black) tone to match the majority of the app's screens
 * (home/call/onboarding/schedule) — see docs/PROJECT_NOTES.md.
 */
export default function NotFound() {
  return (
    <PhoneShell tone="ink">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <span className="text-5xl">📵</span>
        <h1 className="text-xl font-bold text-ink-100">페이지를 찾을 수 없어요</h1>
        <p className="text-sm text-ink-400">
          주소가 잘못되었거나 삭제된 페이지예요.
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full bg-mint-500 px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-600"
        >
          홈으로 가기
        </Link>
      </div>
    </PhoneShell>
  );
}
