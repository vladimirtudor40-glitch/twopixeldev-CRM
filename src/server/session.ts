import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isSessionAlive, TEMP_SESSION_COOKIE } from "@/lib/remember";
import { prisma } from "@/lib/prisma";

export type SessionUser = { id: string; role: "ADMIN" | "AGENT_VANZARI"; name: string | null; email: string | null };

/**
 * Id-ul utilizatorului din sesiune (cookie-ul semnat), fără interogare în baza de date.
 * Paginile îl folosesc ca să pornească interogările în paralel cu verificarea contului din requireUser():
 * cu baza de date la distanță, fiecare interogare făcută una după alta adaugă un drum dus-întors.
 */
export const sessionUserId = cache(async (): Promise<string> => {
  const [session, jar] = await Promise.all([auth(), cookies()]);
  if (!session?.user?.id || !isSessionAlive(session.user, jar.get(TEMP_SESSION_COOKIE)?.value)) redirect("/login");
  return session.user.id;
});

/**
 * Utilizatorul curent; trimite la /login dacă nu e autentificat.
 * Rolul și starea contului se citesc din baza de date la fiecare cerere, ca o schimbare de rol
 * sau o dezactivare făcută de admin să se aplice imediat, nu abia când expiră sesiunea.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const id = await sessionUserId();
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, name: true, email: true, active: true },
  });
  if (!user || !user.active) redirect("/iesire");
  return { id: user.id, role: user.role, name: user.name, email: user.email };
});

export class ForbiddenError extends Error {
  constructor(message = "Nu ai drepturi pentru această acțiune.") {
    super(message);
  }
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new ForbiddenError("Doar un administrator poate face asta.");
  return user;
}
