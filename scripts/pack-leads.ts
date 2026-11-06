/**
 * Pregătește valoarea secretului GitHub LEADURI_ALTE_CATEGORII dintr-un fișier de lead-uri (.xlsx/.csv):
 *   npx tsx scripts/pack-leads.ts leaduri_litoral_alte_categorii.xlsx > secret.txt
 * Rezultatul e un CSV comprimat (gzip) în base64, sub limita de 48 KB a unui secret. Linkurile din celule
 * („Deschide”) sunt scrise ca URL-uri. Workflow-ul îl decodează în data/import/ înainte de build.
 */
import { readFile } from "fs/promises";
import path from "path";
import { gzipSync } from "zlib";
import Papa from "papaparse";
import { parseImportFile } from "../src/server/import/parse";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Folosire: npx tsx scripts/pack-leads.ts fisier.xlsx > secret.txt");
  const buf = await readFile(file);
  const parsed = await parseImportFile(path.basename(file), buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, "Leaduri");
  const csv = Papa.unparse({ fields: parsed.headers, data: parsed.rows.map((r) => parsed.headers.map((h) => r.raw[h] ?? "")) });
  const packed = gzipSync(Buffer.from(csv, "utf8"), { level: 9 }).toString("base64");
  if (packed.length > 48_000) throw new Error(`Prea mare pentru un secret GitHub: ${packed.length} caractere (maxim 48 000).`);
  process.stderr.write(`${parsed.rows.length} rânduri, ${packed.length} caractere\n`);
  process.stdout.write(packed);
}

main().catch((e) => { console.error(e); process.exit(1); });
