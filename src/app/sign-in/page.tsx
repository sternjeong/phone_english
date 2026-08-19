"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { PhoneShell } from "@/components/ui/PhoneShell";

export default function SignInPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn("credentials", { passcode, redirect: false });
    setSubmitting(false);
    if (result?.error) {
      setError("비밀번호가 맞지 않아요.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <PhoneShell tone="ink">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 text-center">
        <div>
          <h1 className="mb-2 text-3xl font-bold italic text-ink-100">Good Morning</h1>
          <p className="text-sm text-ink-400">
            비밀번호를 입력하면 통화 기록과 리포트가 계속 쌓여요.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="비밀번호"
            autoFocus
            className="rounded-full border border-ink-700 bg-ink-900 px-5 py-3 text-center text-sm text-ink-100 outline-none focus:border-mint-500"
          />
          {error && <p className="text-xs text-coral-400">{error}</p>}
          <button
            type="submit"
            disabled={submitting || !passcode}
            className="rounded-full bg-mint-500 px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-mint-600 disabled:opacity-40"
          >
            {submitting ? "확인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </PhoneShell>
  );
}
