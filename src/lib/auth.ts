import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { OWNER_USER_ID } from "@/lib/authConstants";

/**
 * Single-user passcode login — swapped in for Google OAuth because Google
 * Cloud Console's OAuth consent screen kept failing to create ("OAuth 구성을
 * 만드는 중에 오류가 발생했습니다") and this app only has one user anyway
 * (see docs/PROJECT_NOTES.md decisions, 8차). No external console setup,
 * no client id/secret — just AUTH_PASSCODE in .env.local / Vercel env vars.
 *
 * JWT session strategy; OWNER_USER_ID is the fixed id src/lib/db.ts scopes
 * all app data by (there's only ever one user).
 */
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  providers: [
    Credentials({
      credentials: { passcode: { label: "Passcode", type: "password" } },
      async authorize(credentials) {
        const passcode = credentials?.passcode;
        const expected = process.env.AUTH_PASSCODE;
        if (!expected) {
          throw new Error("AUTH_PASSCODE is not set on the server.");
        }
        if (typeof passcode !== "string" || passcode !== expected) {
          return null;
        }
        return { id: OWNER_USER_ID, name: "Me" };
      },
    }),
  ],
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
