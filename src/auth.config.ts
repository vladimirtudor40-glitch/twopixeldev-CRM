import type { NextAuthConfig } from "next-auth";

/**
 * Configurația comună (fără Prisma / bcrypt), folosită și în middleware, care rulează pe Edge.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const loggedIn = !!auth?.user;
      const isLogin = request.nextUrl.pathname.startsWith("/login");
      if (isLogin) return loggedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      return loggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: "ADMIN" | "AGENT_VANZARI" }).role ?? "AGENT_VANZARI";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "AGENT_VANZARI";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
