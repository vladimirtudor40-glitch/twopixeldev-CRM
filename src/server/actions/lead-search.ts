"use server";

import type { ImportRowAction, LeadCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { CATEGORIES } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { createImportBatchFromRows, executeBatch } from "@/server/import/run";
import { IMPORT_HEADERS, labelFromFileName, siteKind, toImportRaw } from "@/server/lead-search/gmaps";
import { exportWithoutSite, readResultFile, revealInExplorer, startSearch, stopSearch } from "@/server/lead-search/runner";
import { canImport } from "@/server/permissions";
import { requireUser } from "@/server/session";
import type { ActionResult } from "./types";

const fail = (e: unknown, fallback: string): { ok: false; error: string } => ({ ok: false, error: e instanceof Error ? e.message : fallback });

export async function startLeadSearch(input: { query: string; depth: number; email: boolean }): Promise<ActionResult<{ file: string }>> {
  await requireUser();
  try {
    const r = startSearch({ query: String(input.query ?? ""), depth: Number(input.depth), email: !!input.email });
    return { ok: true, data: r };
  } catch (e) {
    return fail(e, "Căutarea nu a pornit.");
  }
}

export async function stopLeadSearch(): Promise<ActionResult> {
  await requireUser();
  stopSearch();
  return { ok: true, message: "Căutare oprită." };
}

export async function openResults(file?: string): Promise<ActionResult> {
  await requireUser();
  try {
    revealInExplorer(file || undefined);
    return { ok: true };
  } catch (e) {
    return fail(e, "Nu am putut deschide folderul.");
  }
}

export type ImportedRow = { index: number; action: ImportRowAction | null; leadId: string | null };

/**
 * Importă în CRM firmele alese din rezultatele unei căutări, în categoria aleasă.
 * Trece prin importul obișnuit: deduplicare, completarea câmpurilor goale la lead-urile existente,
 * istoric în Fișier → Importă... și jurnal de audit.
 */
export async function importSearchResults(input: {
  file: string; indexes: number[]; category: LeadCategory;
}): Promise<ActionResult<{ rows: ImportedRow[]; batchId: string }>> {
  const user = await requireUser();
  if (!canImport(user)) return { ok: false, error: "Doar un administrator poate importa lead-uri." };
  if (!CATEGORIES.includes(input.category)) return { ok: false, error: "Alege categoria în care intră lead-urile." };
  let places;
  try {
    places = readResultFile(input.file);
  } catch (e) {
    return fail(e, "Fișierul de rezultate nu poate fi citit.");
  }
  const wanted = new Set(input.indexes);
  const chosen = places.filter((p) => wanted.has(p.index));
  if (!chosen.length) return { ok: false, error: "Nu ai ales nicio firmă." };

  try {
    const batch = await createImportBatchFromRows(prisma, {
      fileName: `Google Maps · ${labelFromFileName(input.file)}.csv`,
      userId: user.id,
      headers: [...IMPORT_HEADERS],
      rows: chosen.map((p, i) => ({ rowNumber: i + 1, raw: toImportRaw(p, input.category) })),
    });
    const s = await executeBatch(prisma, batch.id, user.id);
    const done = await prisma.importRow.findMany({
      where: { batchId: batch.id }, orderBy: { rowNumber: "asc" }, select: { rowNumber: true, action: true, leadId: true },
    });
    const rows = done.map((r) => ({ index: chosen[r.rowNumber - 1]!.index, action: r.action, leadId: r.leadId }));
    revalidatePath("/leaduri");
    revalidatePath("/import");
    const parts = [`${s.create} ${s.create === 1 ? "lead nou" : "lead-uri noi"}`];
    if (s.update) parts.push(`${s.update} completate`);
    if (s.unchanged) parts.push(`${s.unchanged} existau deja`);
    return { ok: true, data: { rows, batchId: batch.id }, message: `Import gata: ${parts.join(", ")}.` };
  } catch (e) {
    return fail(e, "Importul a eșuat.");
  }
}

export async function exportNoSite(file: string): Promise<ActionResult<{ name: string; count: number }>> {
  await requireUser();
  try {
    const r = exportWithoutSite(file, (website) => siteKind(website) !== "own");
    revealInExplorer(r.name);
    return { ok: true, data: r, message: `Salvat ${r.count} firme fără site propriu → ${r.name}` };
  } catch (e) {
    return fail(e, "Exportul nu a reușit.");
  }
}
