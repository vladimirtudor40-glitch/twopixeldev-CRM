import type { NextAuthConfig } from "next-auth";
import { isSessionAlive, TEMP_SESSION_COOKIE } from "@/lib/remember";

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
      // o sesiune fără „Ține-mă minte” se termină când s-a închis programul (cookie-ul temporar lipsește)
      const loggedIn = !!auth?.user && isSessionAlive(auth.user, request.cookies.get(TEMP_SESSION_COOKIE)?.value);
      const isLogin = request.nextUrl.pathname.startsWith("/login");
      if (isLogin) return loggedIn ? Response.redirect(new URL("/", request.nextUrl)) : true;
      return loggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        const u = user as { role?: "ADMIN" | "AGENT_VANZARI"; remember?: boolean; sid?: string };
        token.role = u.role ?? "AGENT_VANZARI";
        token.remember = u.remember !== false;
        token.sid = u.remember === false ? u.sid : undefined;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "AGENT_VANZARI";
        // sesiunile vechi (de dinainte de „Ține-mă minte”) nu au câmpul: rămân persistente
        session.user.remember = token.remember !== false;
        if (typeof token.sid === "string") session.user.sid = token.sid;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
