import type { SessionUser } from "./session";

/** ADMIN editează tot; agentul editează lead-urile lui și pe cele fără responsabil. */
export function canEditLead(user: SessionUser, lead: { ownerId: string | null }): boolean {
  return user.role === "ADMIN" || !lead.ownerId || lead.ownerId === user.id;
}

/** Doar ADMIN schimbă responsabilul altcuiva; agentul își poate asuma un lead liber. */
export function canAssignOwner(user: SessionUser, lead: { ownerId: string | null }, newOwnerId: string | null): boolean {
  if (user.role === "ADMIN") return true;
  if (lead.ownerId === newOwnerId) return true;
  return !lead.ownerId && newOwnerId === user.id;
}

export const canImport = (user: SessionUser) => user.role === "ADMIN";
export const canArchive = (user: SessionUser) => user.role === "ADMIN";
