import { randomUUID } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";
import { formatPhone } from "@/lib/normalize";
import { auditData } from "@/server/audit";
import { refreshDerivedFields } from "@/server/leads/search-text";
import { autoDetectColumnMap, type ColumnMap, type LeadImportData } from "./fields";
import { parseImportFile } from "./parse";
import { FILLABLE_KEYS, planImport, type ExistingLead, type FillableKey, type ImportPlan } from "./plan";

const CHUNK = 200;

/** Pasul 1: citește fișierul și salvează rândurile brute. Nu atinge lead-urile. */
export async function createImportBatch(
  db: PrismaClient,
  args: { fileName: string; buffer: ArrayBuffer; userId: string | null; sheetName?: string | null; id?: string },
) {
  const parsed = await parseImportFile(args.fileName, args.buffer, args.sheetName);
  if (!parsed.headers.length || !parsed.rows.length) {
    throw new Error("Fișierul nu are rânduri cu date. Verifică foaia aleasă și antetul.");
  }
  const columnMap = autoDetectColumnMap(parsed.headers);
  const batch = await db.importBatch.create({
    data: {
      ...(args.id ? { id: args.id } : {}),
      fileName: args.fileName,
      sheetName: parsed.sheetName,
      status: "PREVIZUALIZARE",
      columnMap: { headers: parsed.headers, map: columnMap, sheetNames: parsed.sheetNames },
      totalRows: parsed.rows.length,
      createdById: args.userId,
      defaultOwnerId: args.userId,
    },
  });
  for (let i = 0; i < parsed.rows.length; i += 500) {
    await db.importRow.createMany({
      data: parsed.rows.slice(i, i + 500).map((r) => ({
        batchId: batch.id, rowNumber: r.rowNumber, raw: r.raw as Prisma.InputJsonValue,
      })),
    });
  }
  return batch;
}

export type BatchMapping = { headers: string[]; map: ColumnMap; sheetNames: string[] };

export function readMapping(json: Prisma.JsonValue): BatchMapping {
  const o = (json ?? {}) as Partial<BatchMapping>;
  return { headers: o.headers ?? [], map: o.map ?? {}, sheetNames: o.sheetNames ?? [] };
}

/** Toate lead-urile (și cele arhivate, ca să nu fie re-create), cu valorile câmpurilor completabile. */
export async function loadExistingLeads(db: PrismaClient | Prisma.TransactionClient): Promise<ExistingLead[]> {
  const select = Object.fromEntries([...FILLABLE_KEYS, "id", "category", "nameNormalized", "zone"].map((k) => [k, true])) as Prisma.LeadSelect;
  const leads = (await db.lead.findMany({ select })) as unknown as Array<Record<string, unknown>>;
  return leads.map((l) => {
    const values: Partial<Record<FillableKey, unknown>> = {};
    for (const k of FILLABLE_KEYS) {
      const v = l[k];
      values[k] = v && typeof v === "object" && "toNumber" in v ? (v as { toNumber: () => number }).toNumber() : v;
    }
    return {
      id: l.id as string,
      osmId: (l.osmId as string | null) ?? null,
      category: l.category as ExistingLead["category"],
      nameNormalized: l.nameNormalized as string,
      zone: l.zone as ExistingLead["zone"],
      phoneNormalized: (l.phoneNormalized as string | null) ?? null,
      values,
    };
  });
}

/** Planul importului (pentru previzualizare și pentru rulare). */
export async function planBatch(db: PrismaClient, batchId: string): Promise<{ plan: ImportPlan; mapping: BatchMapping }> {
  const batch = await db.importBatch.findUniqueOrThrow({ where: { id: batchId } });
  const mapping = readMapping(batch.columnMap);
  const [rows, existing] = await Promise.all([
    db.importRow.findMany({ where: { batchId }, orderBy: { rowNumber: "asc" }, select: { rowNumber: true, raw: true, action: true } }),
    loadExistingLeads(db),
  ]);
  const plan = planImport({
    columnMap: mapping.map,
    existing,
    newId: () => randomUUID(),
    rows: rows.map((r) => ({
      rowNumber: r.rowNumber,
      raw: r.raw as Record<string, string>,
      excluded: batch.status === "PREVIZUALIZARE" && r.action === "IGNORAT",
    })),
  });
  return { plan, mapping };
}

function toCreateInput(
  id: string, d: LeadImportData, ctx: { batchId: string; userId: string | null; ownerId: string | null },
): Prisma.LeadCreateManyInput {
  return {
    id,
    name: d.name,
    nameNormalized: d.nameNormalized,
    zone: d.zone,
    category: d.category,
    type: d.type ?? "ALTUL",
    businessType: d.businessType ?? null,
    address: d.address ?? null,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    phone: d.phoneNormalized ? formatPhone(d.phoneNormalized) : null,
    phoneNormalized: d.phoneNormalized ?? null,
    email: d.email ?? null,
    starsOsm: d.starsOsm ?? null,
    categoryMinistry: d.categoryMinistry ?? null,
    roomsCount: d.roomsCount ?? null,
    placesCount: d.placesCount ?? null,
    websiteStatus: d.websiteStatus ?? "NECUNOSCUT",
    websiteUrl: d.websiteUrl ?? null,
    bookingUrl: d.bookingUrl ?? null,
    facebookUrl: d.facebookUrl ?? null,
    instagramUrl: d.instagramUrl ?? null,
    otherLinks: d.otherLinks ?? [],
    googleMapsUrl: d.googleMapsUrl ?? null,
    osmUrl: d.osmUrl ?? null,
    osmId: d.osmId ?? null,
    operatorName: d.operatorName ?? null,
    operatorCui: d.operatorCui ?? null,
    inMinistryList: d.inMinistryList ?? false,
    source: d.source ?? "MANUAL",
    priority: d.priority ?? "B",
    manualCheckNote: d.manualCheckNote ?? null,
    stage: "NOU",
    ownerId: ctx.ownerId,
    createdById: ctx.userId,
    firstImportBatchId: ctx.batchId,
  };
}

function toUpdateInput(patch: Partial<Record<FillableKey, unknown>>): Prisma.LeadUpdateInput {
  const data: Record<string, unknown> = { ...patch };
  if (typeof patch.phoneNormalized === "string") data.phone = formatPhone(patch.phoneNormalized);
  return data as Prisma.LeadUpdateInput;
}

/**
 * Pasul 2: rulează importul. Lead-urile noi se creează, la cele existente se completează doar
 * câmpurile goale. Etapa, responsabilul, notițele și opt-out-ul nu sunt atinse niciodată.
 */
export async function executeBatch(db: PrismaClient, batchId: string, userId: string | null) {
  const claimed = await db.importBatch.updateMany({
    where: { id: batchId, status: "PREVIZUALIZARE" },
    data: { status: "IN_CURS", startedAt: new Date() },
  });
  if (claimed.count === 0) throw new Error("Importul a fost deja rulat sau e în curs.");

  try {
    const batch = await db.importBatch.findUniqueOrThrow({ where: { id: batchId } });
    // planul se calculează ca în previzualizare (status-ul e acum IN_CURS, deci reconstruim excluderile)
    const excludedRows = new Set(
      (await db.importRow.findMany({ where: { batchId, action: "IGNORAT" }, select: { rowNumber: true } })).map((r) => r.rowNumber),
    );
    const mapping = readMapping(batch.columnMap);
    const [rows, existing] = await Promise.all([
      db.importRow.findMany({ where: { batchId }, orderBy: { rowNumber: "asc" }, select: { rowNumber: true, raw: true } }),
      loadExistingLeads(db),
    ]);
    const plan = planImport({
      columnMap: mapping.map,
      existing,
      newId: () => randomUUID(),
      rows: rows.map((r) => ({ rowNumber: r.rowNumber, raw: r.raw as Record<string, string>, excluded: excludedRows.has(r.rowNumber) })),
    });

    const ctx = { batchId, userId, ownerId: batch.defaultOwnerId };
    const creates = [...plan.creates.entries()].map(([id, d]) => toCreateInput(id, d, ctx));
    for (let i = 0; i < creates.length; i += CHUNK) {
      await db.lead.createMany({ data: creates.slice(i, i + CHUNK) });
    }
    const updates = [...plan.updates.entries()];
    for (let i = 0; i < updates.length; i += CHUNK) {
      await db.$transaction(
        updates.slice(i, i + CHUNK).map(([id, patch]) => db.lead.update({ where: { id }, data: toUpdateInput(patch) })),
      );
    }
    for (let i = 0; i < plan.rows.length; i += CHUNK) {
      await db.$transaction(
        plan.rows.slice(i, i + CHUNK).map((r) =>
          db.importRow.update({
            where: { batchId_rowNumber: { batchId, rowNumber: r.rowNumber } },
            data: {
              action: r.action,
              leadId: r.leadId,
              matchedBy: r.mergedIntoRow ? `${r.matchedBy} (rândul ${r.mergedIntoRow} din fișier)` : r.matchedBy,
              updatedFields: r.updatedFields,
              error: r.error,
            },
          }),
        ),
      );
    }
    await refreshDerivedFields(db, [...plan.creates.keys(), ...plan.updates.keys()]);

    const s = plan.summary;
    await db.$transaction([
      db.importBatch.update({
        where: { id: batchId },
        data: {
          status: "FINALIZAT", finishedAt: new Date(),
          createdRows: s.create, updatedRows: s.update, unchangedRows: s.unchanged, skippedRows: s.skipped, errorRows: s.error,
        },
      }),
      db.auditLog.create({
        data: auditData({ userId, action: "IMPORT", entityType: "ImportBatch", entityId: batchId, meta: { fileName: batch.fileName, ...s } }),
      }),
    ]);
    return plan.summary;
  } catch (err) {
    await db.importBatch.update({ where: { id: batchId }, data: { status: "ESUAT", finishedAt: new Date() } });
    throw err;
  }
}
