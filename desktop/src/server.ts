/**
 * Pornește serverul Next.js (build „standalone”) ca proces separat, doar pe 127.0.0.1,
 * folosind Node-ul inclus în Electron (ELECTRON_RUN_AS_NODE).
 */
import { fork, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import type { AppConfig } from "./config";
import { logsDir, serverEntry } from "./paths";

const MAX_LOG_BYTES = 5 * 1024 * 1024;

let child: ChildProcess | null = null;
let currentUrl: string | null = null;

export function serverUrl(): string | null {
  return currentUrl;
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      srv.close(() => (port ? resolve(port) : reject(new Error("Nu am găsit un port liber."))));
    });
  });
}

function openLog(): fs.WriteStream {
  fs.mkdirSync(logsDir(), { recursive: true });
  const file = path.join(logsDir(), "server.log");
  try {
    if (fs.statSync(file).size > MAX_LOG_BYTES) fs.renameSync(file, path.join(logsDir(), "server.vechi.log"));
  } catch {
    // fișierul nu există încă
  }
  const stream = fs.createWriteStream(file, { flags: "a" });
  stream.write(`\n=== Pornire ${new Date().toISOString()} ===\n`);
  return stream;
}

function ping(url: string): Promise<number> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 3000 }, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", () => resolve(0));
    req.on("timeout", () => {
      req.destroy();
      resolve(0);
    });
  });
}

export async function startServer(config: AppConfig): Promise<string> {
  await stopServer();
  const entry = serverEntry();
  if (!fs.existsSync(entry)) throw new Error(`Lipsește serverul aplicației (${entry}). Reinstalează programul.`);

  const port = await freePort();
  // Serverul ascultă doar pe 127.0.0.1, dar Next.js construiește redirecturile cu „localhost”;
  // folosim aceeași adresă peste tot, ca sesiunea (cookie-ul) să rămână pe aceeași origine.
  const base = `http://localhost:${port}`;
  const log = openLog();

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: "1",
    NODE_ENV: "production",
    NEXT_TELEMETRY_DISABLED: "1",
    PORT: String(port),
    HOSTNAME: "127.0.0.1",
    DATABASE_URL: config.databaseUrl,
    DIRECT_URL: config.databaseUrl,
    AUTH_SECRET: config.authSecret,
    AUTH_URL: base,
    AUTH_TRUST_HOST: "true",
  };

  const proc = fork(entry, [], {
    cwd: path.dirname(entry),
    env,
    stdio: ["ignore", "pipe", "pipe", "ipc"],
  });
  child = proc;
  proc.stdout?.pipe(log, { end: false });
  proc.stderr?.pipe(log, { end: false });

  let exited: number | null = null;
  proc.once("exit", (code) => {
    exited = code ?? -1;
    log.write(`=== Serverul s-a oprit (cod ${exited}) ===\n`);
    if (child === proc) {
      child = null;
      currentUrl = null;
    }
  });

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (exited !== null) throw new Error(`Serverul aplicației s-a oprit la pornire (cod ${exited}). Detalii în jurnal.`);
    const status = await ping(`http://127.0.0.1:${port}/login`);
    if (status > 0 && status < 500) {
      currentUrl = base;
      return base;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  await stopServer();
  throw new Error("Serverul aplicației nu a pornit în 60 de secunde. Detalii în jurnal.");
}

export function stopServer(): Promise<void> {
  const proc = child;
  child = null;
  currentUrl = null;
  if (!proc || proc.exitCode !== null) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve();
    }, 3000);
    proc.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    proc.kill();
  });
}
