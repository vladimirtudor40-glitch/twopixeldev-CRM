import { readFile } from "fs/promises";
import path from "path";
import { Prisma, type PrismaClient } from "@prisma/client";
import { createImportBatch, executeBatch } from "./run";

/**
 * Fișiere de lead-uri incluse în program și importate automat, o singură dată, la pornirea serverului.
 * Fișierele nu stau în repo (public): workflow-ul de build le scrie în data/import/ din secretul
 * LEADURI_ALTE_CATEGORII (vezi scripts/pack-leads.ts). Un build fără secret nu conține fișierul și sare importul.
 * Id-ul fix al importului face ca un fișier să fie importat o singură dată, chiar dacă mai multe
 * laptopuri pornesc programul în același timp: al doilea nu poate crea același import.
 */
const AUTO_IMPORTS = [
  { id: "auto-import-alte-categorii-2026-11", file: "leaduri_litoral_alte_categorii.csv" },
] as const;

export async function runAutoImports(db: PrismaClient, log: (msg: string) => void = console.log) {
  for (const item of AUTO_IMPORTS) {
    const existing = await db.importBatch.findUnique({ where: { id: item.id }, select: { status: true } });
    // FINALIZAT, IN_CURS, ESUAT sau ANULAT: nu se mai reia automat (se poate importa manual din Fișier → Importă...).
    if (existing && existing.status !== "PREVIZUALIZARE") continue;

    const admin = await db.user.findFirst({ where: { role: "ADMIN", active: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
    if (!admin) continue; // baza abia creată, fără cont: importul rulează la pornirea următoare

    if (!existing) {
      const buf = await readFile(path.join(process.cwd(), "data", "import", item.file)).catch((e: NodeJS.ErrnoException) => {
        if (e.code === "ENOENT") return null; // build fără fișier: nimic de importat
        throw e;
      });
      if (!buf) continue;
      try {
        await createImportBatch(db, {
          id: item.id,
          fileName: item.file,
          buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
          userId: admin.id,
        });
      } catch (e) {
        // alt laptop tocmai l-a creat: el îl va rula
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
        throw e;
      }
    }
    // executeBatch îl „revendică” atomic (PREVIZUALIZARE → IN_CURS), deci rulează o singură dată.
    const summary = await executeBatch(db, item.id, admin.id).catch((e: unknown) => {
      if (e instanceof Error && e.message.includes("deja rulat")) return null;
      throw e;
    });
    if (summary) log(`Import automat ${item.file}: ${summary.create} noi, ${summary.update} completate, ${summary.unchanged} existau deja.`);
  }
}
