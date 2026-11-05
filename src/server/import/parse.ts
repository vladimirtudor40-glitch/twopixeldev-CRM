import ExcelJS from "exceljs";
import Papa from "papaparse";

export type ParsedFile = {
  sheetName: string | null;
  sheetNames: string[];
  headers: string[];
  rows: { rowNumber: number; raw: Record<string, string> }[];
};

export const MAX_IMPORT_ROWS = 20_000;

/** Textul unei celule ExcelJS; pentru celulele cu link întoarce linkul când textul nu e un URL („Deschide”). */
export function cellToString(cell: ExcelJS.Cell): string {
  const v = cell.value as unknown;
  let text = "";
  let link: string | undefined = cell.hyperlink || undefined;
  if (v === null || v === undefined) text = "";
  else if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") text = String(v);
  else if (v instanceof Date) text = v.toISOString().slice(0, 10);
  else if (typeof v === "object") {
    const o = v as { text?: unknown; hyperlink?: string; richText?: { text: string }[]; result?: unknown; error?: string };
    if (o.richText) text = o.richText.map((r) => r.text).join("");
    else if (o.text !== undefined) {
      text = typeof o.text === "object" && o.text && "richText" in (o.text as object)
        ? (o.text as { richText: { text: string }[] }).richText.map((r) => r.text).join("")
        : String(o.text);
    } else if (o.result !== undefined && o.result !== null) text = String(o.result);
    if (o.hyperlink) link = o.hyperlink;
  }
  text = text.trim();
  if (link && !/^https?:\/\//i.test(text)) return link.trim();
  return text;
}

function uniqueHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>();
  return raw.map((h, i) => {
    const base = h.trim() || `Coloana ${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n > 1 ? `${base} (${n})` : base;
  });
}

/** Alege foaia „Leaduri” dacă există, altfel prima foaie cu date. */
export function pickSheet(names: string[], preferred?: string | null): string | null {
  if (preferred && names.includes(preferred)) return preferred;
  return names.find((n) => /lead/i.test(n)) ?? names[0] ?? null;
}

export async function parseXlsx(buffer: ArrayBuffer, preferredSheet?: string | null): Promise<ParsedFile> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const sheetNames = wb.worksheets.map((w) => w.name);
  const sheetName = pickSheet(sheetNames, preferredSheet);
  const ws = sheetName ? wb.getWorksheet(sheetName) : undefined;
  if (!ws) return { sheetName: null, sheetNames, headers: [], rows: [] };

  // antetul = primul rând cu cel puțin 2 celule completate
  let headerRow = 1;
  for (let r = 1; r <= Math.min(ws.rowCount, 20); r++) {
    const filled = (ws.getRow(r).values as unknown[]).filter((x) => x !== null && x !== undefined && String(x).trim() !== "").length;
    if (filled >= 2) { headerRow = r; break; }
  }
  const hr = ws.getRow(headerRow);
  const colCount = Math.max(ws.columnCount, hr.cellCount);
  const rawHeaders: string[] = [];
  for (let c = 1; c <= colCount; c++) rawHeaders.push(cellToString(hr.getCell(c)));
  while (rawHeaders.length && !rawHeaders[rawHeaders.length - 1]) rawHeaders.pop();
  const headers = uniqueHeaders(rawHeaders);

  const rows: ParsedFile["rows"] = [];
  for (let r = headerRow + 1; r <= ws.rowCount && rows.length < MAX_IMPORT_ROWS; r++) {
    const row = ws.getRow(r);
    const raw: Record<string, string> = {};
    let any = false;
    headers.forEach((h, i) => {
      const v = cellToString(row.getCell(i + 1));
      if (v) any = true;
      raw[h] = v;
    });
    if (any) rows.push({ rowNumber: r, raw });
  }
  return { sheetName, sheetNames, headers, rows };
}

export function parseCsv(text: string): ParsedFile {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const res = Papa.parse<string[]>(clean, { delimiter, skipEmptyLines: "greedy" });
  const data = res.data;
  const headers = uniqueHeaders((data[0] ?? []).map((h) => String(h ?? "")));
  const rows: ParsedFile["rows"] = [];
  for (let i = 1; i < data.length && rows.length < MAX_IMPORT_ROWS; i++) {
    const line = data[i] ?? [];
    const raw: Record<string, string> = {};
    let any = false;
    headers.forEach((h, j) => {
      const v = String(line[j] ?? "").trim();
      if (v) any = true;
      raw[h] = v;
    });
    if (any) rows.push({ rowNumber: i + 1, raw });
  }
  return { sheetName: null, sheetNames: [], headers, rows };
}

export async function parseImportFile(fileName: string, buffer: ArrayBuffer, preferredSheet?: string | null): Promise<ParsedFile> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) return parseCsv(new TextDecoder("utf-8").decode(buffer));
  if (lower.endsWith(".xlsx")) return parseXlsx(buffer, preferredSheet);
  throw new Error("Format necunoscut. Încarcă un fișier .xlsx sau .csv.");
}
