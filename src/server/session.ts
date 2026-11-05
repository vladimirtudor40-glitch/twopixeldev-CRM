import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

export type SessionUser = { id: string; role: "ADMIN" | "AGENT_VANZARI"; name: string | null; email: string | null };

/** Utilizatorul curent; trimite la /login dacă nu e autentificat. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const u = session.user;
  return { id: u.id, role: u.role, name: u.name ?? null, email: u.email ?? null };
}

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
