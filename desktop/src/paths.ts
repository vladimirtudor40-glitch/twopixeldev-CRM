import { app } from "electron";
import path from "node:path";

/**
 * Resursele programului: serverul Next.js și migrările.
 * Instalat: în folderul „resources” al programului. În dezvoltare: dist-desktop/resources din repo.
 */
export function resourcesDir(): string {
  if (app.isPackaged) return process.resourcesPath;
  return path.resolve(app.getAppPath(), "..", "..", "dist-desktop", "resources");
}

export const serverEntry = () => path.join(resourcesDir(), "server", "server.js");
export const migrationsDir = () => path.join(resourcesDir(), "migrations");
export const logsDir = () => path.join(app.getPath("userData"), "jurnale");
