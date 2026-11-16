/**
 * Setările locale ale programului, în %APPDATA%\twopixeldev CRM\config.json.
 * Adresa bazei de date (care conține parola) e criptată cu Windows DPAPI prin safeStorage.
 */
import { app, safeStorage } from "electron";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

type StoredConfig = {
  databaseUrlEncrypted?: string;
  databaseUrlPlain?: string;
  authSecret?: string;
};

export type AppConfig = {
  databaseUrl: string;
  authSecret: string;
};

function configPath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

function readStored(): StoredConfig {
  try {
    return JSON.parse(fs.readFileSync(configPath(), "utf8")) as StoredConfig;
  } catch {
    return {};
  }
}

function writeStored(cfg: StoredConfig): void {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  const tmp = `${configPath()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cfg, null, 2), { encoding: "utf8", mode: 0o600 });
  fs.renameSync(tmp, configPath());
}

export function loadConfig(): AppConfig | null {
  const stored = readStored();
  let databaseUrl: string | undefined;
  if (stored.databaseUrlEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      databaseUrl = safeStorage.decryptString(Buffer.from(stored.databaseUrlEncrypted, "base64"));
    } catch {
      databaseUrl = undefined;
    }
  } else if (stored.databaseUrlPlain) {
    databaseUrl = stored.databaseUrlPlain;
  }
  if (!databaseUrl || !stored.authSecret) return null;
  return { databaseUrl, authSecret: stored.authSecret };
}

/** Cheia de semnare a sesiunilor e generată o singură dată per laptop și păstrată la schimbarea bazei. */
export function saveDatabaseUrl(databaseUrl: string): AppConfig {
  const stored = readStored();
  const authSecret = stored.authSecret ?? randomBytes(48).toString("base64url");
  const next: StoredConfig = { authSecret };
  if (safeStorage.isEncryptionAvailable()) {
    next.databaseUrlEncrypted = safeStorage.encryptString(databaseUrl).toString("base64");
  } else {
    next.databaseUrlPlain = databaseUrl;
  }
  writeStored(next);
  return { databaseUrl, authSecret };
}

export function maskDatabaseUrl(databaseUrl: string): string {
  try {
    const u = new URL(databaseUrl);
    if (u.password) u.password = "••••••";
    return u.toString();
  } catch {
    return "";
  }
}
