import "server-only";
import { spawn, spawnSync, type ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import Papa from "papaparse";
import readline from "readline";
import { describeLogLine, labelFromFileName, parseGmapsCsv, resultFileName, type GmapsPlace } from "./gmaps";

/**
 * Căutarea de lead-uri pe Google Maps, rulată de serverul local al programului de Windows.
 * Programul (Electron) dă serverului calea spre gmaps-scraper.exe și folderul de rezultate
 * (Documente\Leaduri, același ca la aplicația separată „twopixeldev Leaduri”, deci istoricul se păstrează).
 * În versiunea web variabilele lipsesc și căutarea nu e disponibilă.
 */

const MAX_LOG = 300;

type Job = {
  running: boolean;
  query: string;
  depth: number;
  email: boolean;
  file: string;
  startedAt: number;
  endedAt: number;
  found: number;
  failed: number;
  log: string[];
  error: string;
  stopping: boolean;
  proc: ChildProcess | null;
};

export type SearchStatus = {
  available: boolean;
  started: boolean;
  running: boolean;
  query: string;
  file: string;
  found: number;
  failed: number;
  elapsed: number;
  log: string[];
  error: string;
  stopped: boolean;
};

export type ResultFile = { name: string; label: string; size: number; mtime: number };

const g = globalThis as unknown as { __tpdLeadSearch?: Job };
const job = (): Job =>
  (g.__tpdLeadSearch ??= {
    running: false, query: "", depth: 1, email: false, file: "", startedAt: 0, endedAt: 0,
    found: 0, failed: 0, log: [], error: "", stopping: false, proc: null,
  });

export const scraperPath = () => process.env.TPD_GMAPS_SCRAPER ?? "";
export const resultsDir = () => process.env.TPD_LEADURI_DIR ?? "";
const workDir = () => process.env.TPD_GMAPS_WORKDIR || path.join(resultsDir(), ".cautare");

/** Căutarea e disponibilă doar în programul de Windows, care include scraper-ul. */
export function isAvailable(): boolean {
  const exe = scraperPath();
  return !!exe && !!resultsDir() && fs.existsSync(exe);
}

function pushLog(j: Job, msg: string) {
  const t = new Date();
  const hh = [t.getHours(), t.getMinutes(), t.getSeconds()].map((n) => String(n).padStart(2, "0")).join(":");
  j.log.push(`${hh}  ${msg}`);
  if (j.log.length > MAX_LOG) j.log.splice(0, j.log.length - MAX_LOG);
}

export function startSearch(input: { query: string; depth: number; email: boolean }): { file: string } {
  if (!isAvailable()) throw new Error("Căutarea pe Google Maps merge doar în programul de Windows.");
  const queries = input.query.split("\n").map((q) => q.trim()).filter(Boolean);
  if (!queries.length) throw new Error("Scrie ce cauți.");
  if (queries.length > 20) throw new Error("Cel mult 20 de căutări odată.");
  const depth = Math.min(10, Math.max(1, Math.round(input.depth) || 1));
  const j = job();
  if (j.running) throw new Error("O căutare rulează deja. Oprește-o sau așteaptă să se termine.");

  fs.mkdirSync(resultsDir(), { recursive: true });
  fs.mkdirSync(workDir(), { recursive: true });
  const file = path.join(resultsDir(), resultFileName(queries[0]!, new Date()));
  const qfile = path.join(workDir(), "queries.txt");
  fs.writeFileSync(qfile, queries.join("\n") + "\n", "utf8");

  const args = ["-input", qfile, "-results", file, "-depth", String(depth), "-lang", "ro", "-exit-on-inactivity", "3m", "-c", "2"];
  if (input.email) args.push("-email");

  Object.assign(j, {
    running: true, query: queries.join(" · "), depth, email: input.email, file, startedAt: Date.now(), endedAt: 0,
    found: 0, failed: 0, log: [], error: "", stopping: false, proc: null,
  } satisfies Partial<Job>);

  let proc: ChildProcess;
  try {
    proc = spawn(scraperPath(), args, { cwd: workDir(), windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    j.running = false;
    j.error = `Nu pot porni căutarea: ${e instanceof Error ? e.message : String(e)}`;
    throw new Error(j.error);
  }
  j.proc = proc;
  pushLog(j, "→ pornesc căutarea…");

  for (const stream of [proc.stdout, proc.stderr]) {
    if (!stream) continue;
    readline.createInterface({ input: stream }).on("line", (line) => {
      const d = describeLogLine(line);
      if (d.found) j.found++;
      if (d.failed) j.failed++;
      if (d.msg) pushLog(j, d.msg);
    });
  }
  proc.once("error", (e) => {
    j.error = `Nu pot porni căutarea: ${e.message}`;
  });
  proc.once("close", (code) => {
    if (j.proc !== proc) return;
    j.running = false;
    j.endedAt = Date.now();
    j.proc = null;
    if (code && !j.stopping && !j.error) j.error = `Căutarea s-a oprit cu eroare (cod ${code}). Vezi jurnalul.`;
  });
  return { file: path.basename(file) };
}

/** Oprește căutarea și browserul pornit de ea (tot arborele de procese). */
export function stopSearch(): void {
  const j = job();
  const proc = j.proc;
  if (!j.running || !proc?.pid) return;
  j.stopping = true;
  if (process.platform === "win32") {
    spawnSync("taskkill", ["/T", "/F", "/PID", String(proc.pid)], { windowsHide: true });
  } else {
    proc.kill("SIGTERM");
  }
}

export function searchStatus(): SearchStatus {
  const j = job();
  const end = j.running || !j.endedAt ? Date.now() : j.endedAt;
  return {
    available: isAvailable(),
    started: j.startedAt > 0,
    running: j.running,
    query: j.query,
    file: j.file ? path.basename(j.file) : "",
    found: j.found,
    failed: j.failed,
    elapsed: j.startedAt ? Math.max(0, (end - j.startedAt) / 1000) : 0,
    log: j.log.slice(-80),
    error: j.error,
    stopped: j.stopping,
  };
}

/** Istoricul: fișierele CSV din Documente\Leaduri, cele mai noi primele. */
export function listResultFiles(): ResultFile[] {
  const dir = resultsDir();
  if (!dir || !fs.existsSync(dir)) return [];
  const out: ResultFile[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!e.isFile() || !/\.csv$/i.test(e.name)) continue;
    try {
      const st = fs.statSync(path.join(dir, e.name));
      if (st.size === 0) continue;
      out.push({ name: e.name, label: labelFromFileName(e.name), size: st.size, mtime: st.mtimeMs });
    } catch {
      // fișier șters între timp
    }
  }
  return out.sort((a, b) => b.mtime - a.mtime);
}

/** Doar fișiere .csv direct în folderul de rezultate (numele vine din pagină). */
export function safeResultPath(name: string): string {
  const base = path.basename(String(name ?? ""));
  if (!base || base !== name || !/\.csv$/i.test(base)) throw new Error("Fișier nepermis.");
  return path.join(resultsDir(), base);
}

export function readResultFile(name: string): GmapsPlace[] {
  const p = safeResultPath(name);
  if (!fs.existsSync(p)) return [];
  return parseGmapsCsv(fs.readFileSync(p, "utf8"));
}

/** Deschide folderul de rezultate sau arată fișierul în Explorer. */
export function revealInExplorer(name?: string): void {
  if (process.platform !== "win32") return;
  if (name) {
    spawn("explorer", [`/select,${safeResultPath(name)}`], { detached: true, windowsHide: false, stdio: "ignore" }).unref();
  } else {
    fs.mkdirSync(resultsDir(), { recursive: true });
    spawn("explorer", [resultsDir()], { detached: true, stdio: "ignore" }).unref();
  }
}

/** Salvează lângă fișier doar firmele fără site propriu (…-fara-site.csv), cu toate coloanele originale. */
export function exportWithoutSite(name: string, keep: (website: string) => boolean): { name: string; count: number } {
  const src = safeResultPath(name);
  const text = fs.readFileSync(src, "utf8").replace(/^﻿/, "");
  const parsed = Papa.parse<string[]>(text, { skipEmptyLines: "greedy" });
  const [head, ...rows] = parsed.data;
  if (!head) throw new Error("Fișierul e gol.");
  const wi = head.indexOf("website");
  const kept = rows.filter((r) => wi < 0 || keep((r[wi] ?? "").trim()));
  const dst = src.replace(/(-fara-site)?\.csv$/i, "-fara-site.csv");
  fs.writeFileSync(dst, "﻿" + Papa.unparse([head, ...kept]), "utf8");
  return { name: path.basename(dst), count: kept.length };
}
