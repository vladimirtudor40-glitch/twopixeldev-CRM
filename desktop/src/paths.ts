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
/** Căutarea de lead-uri pe Google Maps: scraper-ul inclus în program și folderul cu rezultate. */
export const gmapsScraper = () => path.join(resourcesDir(), "gmaps", process.platform === "win32" ? "gmaps-scraper.exe" : "gmaps-scraper");
export const leadSearchDir = () => path.join(app.getPath("documents"), "Leaduri");
export const leadSearchWorkDir = () => path.join(app.getPath("userData"), "cautare-leaduri");
