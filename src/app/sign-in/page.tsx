import { signIn } from "@/lib/auth";
import { PhoneShell } from "@/components/ui/PhoneShell";

export default function SignInPage() {
  return (
    <PhoneShell tone="ink">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 text-center">
        <div>
          <h1 className="mb-2 text-3xl font-bold italic text-ink-100">Good Morning</h1>
          <p className="text-sm text-ink-400">
            로그인하면 통화 기록과 리포트가 계정에 계속 쌓여요.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="flex items-center gap-3 rounded-full bg-ink-100 px-6 py-3 text-sm font-semibold text-ink-950 transition hover:bg-white"
          >
            <GoogleIcon />
            Google로 로그인
          </button>
        </form>
      </div>
    </PhoneShell>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.13-.85 2.09-1.8 2.73v2.27h2.92c1.7-1.57 2.68-3.88 2.68-6.64z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.92-2.27c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.34C2.44 15.98 5.48 18 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.71c-.18-.54-.28-1.11-.28-1.71s.1-1.17.28-1.71V4.95H.96A8.996 8.996 0 0 0 0 9c0 1.45.35 2.83.96 4.05l3.01-2.34z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.59-2.59C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.95l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}
