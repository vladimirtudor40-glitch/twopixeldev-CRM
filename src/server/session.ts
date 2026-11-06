import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type SessionUser = { id: string; role: "ADMIN" | "AGENT_VANZARI"; name: string | null; email: string | null };

/**
 * Utilizatorul curent; trimite la /login dacă nu e autentificat.
 * Rolul și starea contului se citesc din baza de date la fiecare cerere, ca o schimbare de rol
 * sau o dezactivare făcută de admin să se aplice imediat, nu abia când expiră sesiunea.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
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
