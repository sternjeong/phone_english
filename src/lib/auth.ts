import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Google-only sign-in, JWT session strategy (no auth DB adapter needed —
 * app data in src/lib/db.ts is scoped by the user's Google account email
 * instead). See docs/PROJECT_NOTES.md decisions for why.
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in" },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    // Required for `auth` to actually gate routes when used from
    // src/proxy.ts — without this, exporting `auth` as Proxy only attaches
    // `req.auth`, it does NOT redirect unauthenticated requests on its own
    // (confirmed by actually running the app: unauth'd requests returned
    // 200 instead of a redirect to /sign-in until this was added).
    authorized({ auth: session }) {
      return !!session;
    },
  },
});
