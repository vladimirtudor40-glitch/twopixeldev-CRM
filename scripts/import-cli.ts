/**
 * Import din linia de comandă (același cod ca în aplicație):
 *   npm run import:cli -- cale/leaduri_litoral.xlsx [email-utilizator]
 * Afișează previzualizarea, apoi rulează importul.
 */
import { readFile } from "fs/promises";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { createImportBatch, executeBatch, planBatch } from "../src/server/import/run";

async function main() {
  const [file, email] = process.argv.slice(2);
  if (!file) throw new Error("Folosire: npm run import:cli -- fisier.xlsx [email]");
  const db = new PrismaClient();
  try {
    const user = email ? await db.user.findUnique({ where: { email } }) : await db.user.findFirst({ where: { role: "ADMIN" } });
    const buf = await readFile(file);
    const batch = await createImportBatch(db, {
      fileName: path.basename(file),
      buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer,
      userId: user?.id ?? null,
    });
    const { plan } = await planBatch(db, batch.id);
    console.log("Previzualizare:", plan.summary);
    const result = await executeBatch(db, batch.id, user?.id ?? null);
    console.log("Rezultat:", result, "· import", batch.id);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
