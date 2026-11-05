import type { AuditAction, Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export type AuditEntry = {
  userId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  changes?: Record<string, { from: unknown; to: unknown }> | null;
  meta?: Record<string, unknown> | null;
};

export function auditData(e: AuditEntry): Prisma.AuditLogCreateManyInput {
  return {
    userId: e.userId,
    action: e.action,
    entityType: e.entityType,
    entityId: e.entityId ?? null,
    changes: (e.changes ?? undefined) as Prisma.InputJsonValue | undefined,
    meta: (e.meta ?? undefined) as Prisma.InputJsonValue | undefined,
  };
}

export async function writeAudit(db: Db, e: AuditEntry) {
  await db.auditLog.create({ data: auditData(e) });
}

/** Diferențele dintre două obiecte, doar pe cheile date (pentru AuditLog.changes). */
export function diff(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys: string[],
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const k of keys) {
    const a = normalizeForDiff(before[k]);
    const b = normalizeForDiff(after[k]);
    if (JSON.stringify(a) !== JSON.stringify(b)) out[k] = { from: a, to: b };
  }
  return out;
}

function normalizeForDiff(v: unknown): unknown {
  if (v === undefined || v === "") return null;
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === "object" && "toNumber" in v && typeof (v as { toNumber: unknown }).toNumber === "function") {
    return (v as { toNumber: () => number }).toNumber();
  }
  return v;
}
