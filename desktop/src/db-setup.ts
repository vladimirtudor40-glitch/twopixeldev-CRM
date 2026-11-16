/**
 * Pregătirea bazei de date de pe Supabase, direct din program (fără Prisma CLI):
 * verificarea conexiunii, aplicarea migrărilor și crearea primului admin.
 * Migrările sunt înregistrate în tabela `_prisma_migrations`, compatibilă cu `prisma migrate deploy`.
 */
import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { Client, type ClientConfig } from "pg";
import { DEFAULT_OFFER_TEMPLATES } from "../../prisma/offer-templates";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
const MIGRATION_LOCK_ID = 727073690;

export class SetupError extends Error {}

/**
 * Parolele cu caractere speciale (@ # / ? % :) strică adresa dacă nu sunt codate.
 * Parola e tot ce se află între primul „:” de după utilizator și ultimul „@” dinaintea serverului.
 */
export function encodePassword(text: string): string {
  const m = /^(postgres(?:ql)?:\/\/)([^:@/]+):(.*)@([^@/]+)(\/.*)?$/i.exec(text);
  if (!m) return text;
  const [, scheme, user, password, host, rest = ""] = m;
  let plain = password ?? "";
  try {
    plain = decodeURIComponent(plain);
  } catch {
    // conține „%” care nu face parte dintr-o codare; îl păstrăm ca atare
  }
  return `${scheme}${user}:${encodeURIComponent(plain)}@${host}${rest}`;
}

/** Verifică adresa lipită de utilizator și o completează cu opțiunile de care are nevoie Prisma. */
export function normalizeDatabaseUrl(raw: string): string {
  const text = raw.trim();
  if (!text) throw new SetupError("Lipește adresa bazei de date (connection string).");
  if (/\[YOUR-PASSWORD\]/i.test(text)) {
    throw new SetupError("Înlocuiește [YOUR-PASSWORD] cu parola bazei de date din Supabase.");
  }
  let url: URL;
  try {
    url = new URL(encodePassword(text));
  } catch {
    throw new SetupError("Adresa nu e validă. Trebuie să înceapă cu postgresql://");
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new SetupError("Adresa trebuie să înceapă cu postgresql://");
  }
  if (!url.hostname) throw new SetupError("Adresa nu conține serverul bazei de date.");
  if (!url.password && !LOCAL_HOSTS.has(url.hostname)) {
    throw new SetupError("Adresa nu conține parola. Forma corectă: postgresql://utilizator:PAROLA@server:5432/postgres");
  }
  if (!url.pathname || url.pathname === "/") url.pathname = "/postgres";
  const isLocal = LOCAL_HOSTS.has(url.hostname);
  if (!isLocal && !url.searchParams.has("sslmode")) url.searchParams.set("sslmode", "require");
  // Pooler-ul Supabase în mod „transaction” (portul 6543) nu suportă instrucțiunile pregătite ale Prisma
  if (url.port === "6543" && !url.searchParams.has("pgbouncer")) url.searchParams.set("pgbouncer", "true");
  if (!url.searchParams.has("connection_limit")) url.searchParams.set("connection_limit", "5");
  return url.toString();
}

/** Configurația pentru driverul `pg`: aceeași adresă, fără parametrii specifici Prisma. */
function pgConfig(databaseUrl: string): ClientConfig {
  const url = new URL(databaseUrl);
  const sslmode = url.searchParams.get("sslmode");
  for (const key of ["sslmode", "pgbouncer", "connection_limit", "schema", "pool_timeout", "connect_timeout"]) {
    url.searchParams.delete(key);
  }
  const wantsSsl = sslmode ? sslmode !== "disable" : !LOCAL_HOSTS.has(url.hostname);
  return {
    connectionString: url.toString(),
    // Supabase folosește un certificat propriu; conexiunea rămâne criptată
    ssl: wantsSsl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 15_000,
    application_name: "twopixeldev-crm-setup",
  };
}

function explainPgError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  const msg = err.message ?? String(e);
  if (err.code === "28P01" || /password authentication failed/i.test(msg)) {
    return "Parola sau utilizatorul nu sunt corecte. Verifică parola bazei de date din Supabase (Project Settings → Database).";
  }
  if (err.code === "ENOTFOUND" || err.code === "EAI_AGAIN") {
    return "Serverul nu a fost găsit. Verifică adresa și conexiunea la internet.";
  }
  if (err.code === "ENETUNREACH" || err.code === "EHOSTUNREACH") {
    return "Serverul nu poate fi accesat din rețeaua ta. În Supabase folosește adresa „Session pooler” (…pooler.supabase.com:5432), nu „Direct connection”.";
  }
  if (err.code === "ECONNREFUSED") return "Serverul a refuzat conexiunea. Verifică portul (5432).";
  if (/timeout/i.test(msg)) return "Conexiunea a expirat. Verifică internetul și adresa (Session pooler, port 5432).";
  if (/tenant or user not found/i.test(msg)) {
    return "Utilizatorul nu e corect pentru pooler. Copiază din nou adresa „Session pooler” din Supabase (utilizatorul arată ca postgres.xxxxxxxx).";
  }
  return msg;
}

async function withClient<T>(databaseUrl: string, fn: (c: Client) => Promise<T>): Promise<T> {
  const client = new Client(pgConfig(databaseUrl));
  try {
    await client.connect();
  } catch (e) {
    throw new SetupError(explainPgError(e));
  }
  try {
    return await fn(client);
  } catch (e) {
    if (e instanceof SetupError) throw e;
    throw new SetupError(explainPgError(e));
  } finally {
    await client.end().catch(() => undefined);
  }
}

type Migration = { name: string; sql: string; checksum: string };

function readMigrations(migrationsDir: string): Migration[] {
  if (!fs.existsSync(migrationsDir)) throw new SetupError(`Lipsesc fișierele de migrare (${migrationsDir}).`);
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(migrationsDir, d.name, "migration.sql")))
    .map((d) => d.name)
    .sort()
    .map((name) => {
      const sql = fs.readFileSync(path.join(migrationsDir, name, "migration.sql"), "utf8");
      return { name, sql, checksum: createHash("sha256").update(sql).digest("hex") };
    });
}

async function tableExists(c: Client, table: string): Promise<boolean> {
  const r = await c.query<{ exists: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) AS "exists"`,
    [table],
  );
  return r.rows[0]?.exists ?? false;
}

async function appliedMigrations(c: Client): Promise<Map<string, { finished: boolean; checksum: string }>> {
  const map = new Map<string, { finished: boolean; checksum: string }>();
  if (!(await tableExists(c, "_prisma_migrations"))) return map;
  const r = await c.query<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null; checksum: string }>(
    `SELECT migration_name, finished_at, rolled_back_at, checksum FROM "_prisma_migrations"`,
  );
  for (const row of r.rows) {
    if (row.rolled_back_at) continue;
    map.set(row.migration_name, { finished: row.finished_at !== null, checksum: row.checksum });
  }
  return map;
}

export type DatabaseStatus = {
  serverVersion: string;
  pendingMigrations: number;
  userCount: number;
};

export async function inspectDatabase(databaseUrl: string, migrationsDir: string): Promise<DatabaseStatus> {
  const migrations = readMigrations(migrationsDir);
  return withClient(databaseUrl, async (c) => {
    const version = await c.query<{ server_version: string }>("SHOW server_version");
    const applied = await appliedMigrations(c);
    const pending = migrations.filter((m) => !applied.get(m.name)?.finished).length;
    const userCount = (await tableExists(c, "User"))
      ? Number((await c.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM "User"`)).rows[0]?.n ?? 0)
      : 0;
    return { serverVersion: version.rows[0]?.server_version ?? "", pendingMigrations: pending, userCount };
  });
}

/** Aplică migrările lipsă. Un lacăt în baza de date împiedică două laptopuri să migreze simultan. */
export async function migrateDatabase(databaseUrl: string, migrationsDir: string, log: (line: string) => void): Promise<number> {
  const migrations = readMigrations(migrationsDir);
  return withClient(databaseUrl, async (c) => {
    await c.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    try {
      await c.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) PRIMARY KEY NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      )`);
      const applied = await appliedMigrations(c);
      let count = 0;
      for (const m of migrations) {
        const prev = applied.get(m.name);
        if (prev?.finished) continue;
        if (prev && !prev.finished) {
          throw new SetupError(
            `Migrarea „${m.name}” a eșuat anterior și a rămas neterminată. Verifică baza de date în Supabase înainte de a continua.`,
          );
        }
        log(`Aplic migrarea ${m.name}…`);
        const id = randomUUID();
        await c.query("BEGIN");
        try {
          await c.query(
            `INSERT INTO "_prisma_migrations" ("id", "checksum", "migration_name", "started_at", "applied_steps_count") VALUES ($1, $2, $3, now(), 0)`,
            [id, m.checksum, m.name],
          );
          await c.query(m.sql);
          await c.query(`UPDATE "_prisma_migrations" SET "finished_at" = now(), "applied_steps_count" = 1 WHERE "id" = $1`, [id]);
          await c.query("COMMIT");
        } catch (e) {
          await c.query("ROLLBACK").catch(() => undefined);
          throw new SetupError(`Migrarea „${m.name}” nu a reușit: ${explainPgError(e)}`);
        }
        count++;
      }
      return count;
    } finally {
      await c.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => undefined);
    }
  });
}

export type AdminInput = { name: string; email: string; password: string };

export function validateAdmin(input: AdminInput): AdminInput {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (!name) throw new SetupError("Scrie numele tău.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new SetupError("Adresa de email nu e validă.");
  if (input.password.length < 10) throw new SetupError("Parola trebuie să aibă cel puțin 10 caractere.");
  return { name, email, password: input.password };
}

/** Creează primul admin (doar dacă baza nu are încă utilizatori) și șabloanele de ofertă lipsă. */
export async function createFirstAdmin(databaseUrl: string, raw: AdminInput): Promise<"creat" | "exista"> {
  const admin = validateAdmin(raw);
  const passwordHash = await bcrypt.hash(admin.password, 12);
  return withClient(databaseUrl, async (c) => {
    await c.query("BEGIN");
    try {
      await c.query(`LOCK TABLE "User" IN EXCLUSIVE MODE`);
      const existing = await c.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM "User"`);
      if (Number(existing.rows[0]?.n ?? 0) > 0) {
        await c.query("ROLLBACK");
        return "exista" as const;
      }
      const adminId = randomUUID();
      await c.query(
        `INSERT INTO "User" ("id", "name", "email", "passwordHash", "role", "active", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'ADMIN', true, now(), now())`,
        [adminId, admin.name, admin.email, passwordHash],
      );
      for (const t of DEFAULT_OFFER_TEMPLATES) {
        const found = await c.query(`SELECT 1 FROM "OfferTemplate" WHERE "name" = $1 LIMIT 1`, [t.name]);
        if (found.rowCount) continue;
        await c.query(
          `INSERT INTO "OfferTemplate" ("id", "name", "description", "setupPrice", "monthlyFee", "includedFeatures", "isDefault", "createdById", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
          [randomUUID(), t.name, t.description, t.setupPrice, t.monthlyFee, t.includedFeatures, t.isDefault, adminId],
        );
      }
      await c.query("COMMIT");
      return "creat" as const;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => undefined);
      throw e;
    }
  });
}
