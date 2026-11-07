import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isSessionAlive, TEMP_SESSION_COOKIE } from "@/lib/remember";
import { prisma } from "@/lib/prisma";
import { crmEmailFor, proxiedEmail, WEB_MODE } from "@/lib/web";

export type SessionUser = { id: string; role: "ADMIN" | "AGENT_VANZARI"; name: string | null; email: string | null };

/**
 * Id-ul utilizatorului din sesiune (cookie-ul semnat), fără interogare în baza de date.
 * Paginile îl folosesc ca să pornească interogările în paralel cu verificarea contului din requireUser():
 * cu baza de date la distanță, fiecare interogare făcută una după alta adaugă un drum dus-întors.
 */
export const sessionUserId = cache(async (): Promise<string> => {
  if (WEB_MODE) return webUserId();
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

/**
 * Versiunea web (în site): contul vine de la Worker-ul site-ului, după login-ul din site (src/lib/web.ts).
 * Primul acces al unui cont din site îi creează contul în CRM, ca ADMIN: în site intră doar
 * proprietarii (conturile din secretul USERS al site-ului). Din Utilizatori i se poate schimba rolul
 * sau poate fi dezactivat.
 */
const webUserId = cache(async (): Promise<string> => {
  const siteEmail = proxiedEmail(await headers());
  // middleware-ul oprește deja cererile fără secret; aici e a doua verificare, pentru acțiuni și pagini
  if (!siteEmail) throw new ForbiddenError("Neautorizat.");
  const email = crmEmailFor(siteEmail);
  const found = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (found) return found.id;
  const name = email.split("@")[0]!.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const created = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, name, role: "ADMIN", active: true },
    select: { id: true },
  });
  await prisma.auditLog.create({ data: { userId: created.id, action: "CREARE", entityType: "User", entityId: created.id, meta: { via: "site" } } }).catch(() => {});
  return created.id;
});
