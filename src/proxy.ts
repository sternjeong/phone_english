export { auth as proxy } from "@/lib/auth";

/**
 * Gate the whole app behind Google sign-in — this is a personal-use app
 * now that it has per-user history, not a public product. `auth` from
 * NextAuth redirects unauthenticated requests to `pages.signIn` (see
 * src/lib/auth.ts) automatically when used as Proxy (Next.js 16's renamed
 * middleware convention — see node_modules/next/dist/docs/.../proxy.md).
 */
export const config = {
  matcher: [
    // Page routes only — API routes guard themselves via requireUser() so
    // a failed check returns 401 JSON instead of an HTML redirect.
    "/((?!api|sign-in|_next/static|_next/image|favicon.ico).*)",
  ],
};
