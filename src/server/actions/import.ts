"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { TARGET_BY_KEY } from "@/server/import/fields";
import { MAX_IMPORT_ROWS } from "@/server/import/parse";
import { createImportBatch, executeBatch, readMapping } from "@/server/import/run";
import { canImport } from "@/server/permissions";
import { requireUser } from "@/server/session";
import type { ActionResult } from "./types";

const MAX_BYTES = 8 * 1024 * 1024;

export async function uploadImportFile(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (!canImport(user)) return { ok: false, error: "Doar un administrator poate importa lead-uri." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Alege un fișier .xlsx sau .csv." };
  if (file.size > MAX_BYTES) return { ok: false, error: "Fișierul e mai mare de 8 MB. Împarte-l în mai multe fișiere." };
  if (!/\.(xlsx|csv|txt)$/i.test(file.name)) return { ok: false, error: "Format necunoscut. Încarcă un fișier .xlsx sau .csv (exportul scriptului)." };

  let batchId: string;
  try {
    const batch = await createImportBatch(prisma, {
      fileName: file.name,
      buffer: await file.arrayBuffer(),
      userId: user.id,
      sheetName: String(formData.get("sheet") || "") || null,
    });
    batchId = batch.id;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fișierul nu a putut fi citit.";
    return { ok: false, error: msg.includes("Format") || msg.includes("rânduri") ? msg : `Fișierul nu a putut fi citit (${msg}). Verifică să fie un .xlsx valid, nu .xls.` };
  }
  revalidatePath("/import");
  redirect(`/import/${batchId}`);
}

async function editableBatch(batchId: string) {
  const user = await requireUser();
  if (!canImport(user)) return { user, batch: null, error: "Doar un administrator poate importa lead-uri." };
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) return { user, batch: null, error: "Importul nu mai există." };
  if (batch.status !== "PREVIZUALIZARE") return { user, batch: null, error: "Importul a fost deja rulat." };
  return { user, batch, error: null };
}

export async function saveColumnMap(batchId: string, map: Record<string, string>): Promise<ActionResult> {
  const { batch, error } = await editableBatch(batchId);
  if (!batch) return { ok: false, error: error! };
  const mapping = readMapping(batch.columnMap);
  const clean: Record<string, string> = {};
  const used = new Set<string>();
  for (const h of mapping.headers) {
    const key = map[h] ?? "";
    if (key && !TARGET_BY_KEY.has(key)) return { ok: false, error: `Câmp necunoscut pentru coloana „${h}”.` };
    if (key && used.has(key)) return { ok: false, error: `Câmpul „${TARGET_BY_KEY.get(key)!.label}” e ales pentru două coloane.` };
    if (key) used.add(key);
    clean[h] = key;
  }
  if (!used.has("name")) return { ok: false, error: "Alege coloana cu numele unității." };
  await prisma.importBatch.update({ where: { id: batchId }, data: { columnMap: { ...mapping, map: clean } } });
  revalidatePath(`/import/${batchId}`);
  return { ok: true, message: "Maparea a fost salvată. Previzualizarea e actualizată." };
}

export async function setDefaultOwner(batchId: string, ownerId: string): Promise<ActionResult> {
  const { batch, error } = await editableBatch(batchId);
  if (!batch) return { ok: false, error: error! };
  const owner = ownerId ? await prisma.user.findFirst({ where: { id: ownerId, active: true } }) : null;
  await prisma.importBatch.update({ where: { id: batchId }, data: { defaultOwnerId: owner?.id ?? null } });
  revalidatePath(`/import/${batchId}`);
  return { ok: true };
}

export async function toggleRowExcluded(batchId: string, rowNumber: number, excluded: boolean): Promise<ActionResult> {
  const { batch, error } = await editableBatch(batchId);
  if (!batch) return { ok: false, error: error! };
  await prisma.importRow.update({
    where: { batchId_rowNumber: { batchId, rowNumber } },
    data: { action: excluded ? "IGNORAT" : null },
  });
  revalidatePath(`/import/${batchId}`);
  return { ok: true };
}

export async function runImport(batchId: string): Promise<ActionResult> {
  const { user, batch, error } = await editableBatch(batchId);
  if (!batch) return { ok: false, error: error! };
  if (batch.totalRows > MAX_IMPORT_ROWS) return { ok: false, error: "Prea multe rânduri într-un singur import." };
  try {
    const s = await executeBatch(prisma, batchId, user.id);
    revalidatePath("/leaduri");
    revalidatePath("/import");
    revalidatePath(`/import/${batchId}`);
    return { ok: true, message: `Import finalizat: ${s.create} lead-uri noi, ${s.update} completate, ${s.unchanged} neschimbate.` };
  } catch (err) {
    revalidatePath(`/import/${batchId}`);
    return { ok: false, error: err instanceof Error ? err.message : "Importul a eșuat." };
  }
}

export async function cancelImport(batchId: string): Promise<ActionResult> {
  const { batch, error } = await editableBatch(batchId);
  if (!batch) return { ok: false, error: error! };
  await prisma.importBatch.update({ where: { id: batchId }, data: { status: "ANULAT", finishedAt: new Date() } });
  revalidatePath("/import");
  redirect("/import");
}
