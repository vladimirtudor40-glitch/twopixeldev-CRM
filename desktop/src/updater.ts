/**
 * Actualizarea automată a programului din GitHub Releases (repo public, fără token).
 * Verifică la pornire și apoi la câteva ore; descarcă în fundal și întreabă înainte de repornire.
 * Dacă alegi „Mai târziu”, versiunea nouă se instalează la închiderea programului.
 */
import { app, dialog, type BrowserWindow } from "electron";
import { autoUpdater, type UpdateInfo } from "electron-updater";
import fs from "node:fs";
import path from "node:path";
import { logsDir } from "./paths";

const CHECK_EVERY_MS = 4 * 60 * 60 * 1000;

let started = false;
let manualCheck = false;
let downloadedVersion: string | null = null;
let getWindow: () => BrowserWindow | null = () => null;

function log(level: string, ...args: unknown[]): void {
  try {
    fs.mkdirSync(logsDir(), { recursive: true });
    const line = `${new Date().toISOString()} [${level}] ${args.map((a) => (a instanceof Error ? a.message : String(a))).join(" ")}\n`;
    fs.appendFileSync(path.join(logsDir(), "actualizari.log"), line);
  } catch {
    // jurnalul nu e esențial
  }
}

function showBox(options: Electron.MessageBoxOptions) {
  const win = getWindow();
  return win && !win.isDestroyed() ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options);
}

async function askToRestart(info: UpdateInfo): Promise<void> {
  const { response } = await showBox({
    type: "info",
    title: "Actualizare gata de instalare",
    message: `Versiunea ${info.version} a programului e descărcată.`,
    detail:
      "Programul se închide câteva secunde, se actualizează și se redeschide singur. Datele tale nu sunt afectate.\n\n" +
      "Dacă alegi „Mai târziu”, actualizarea se instalează când închizi programul.",
    buttons: ["Repornește acum", "Mai târziu"],
    defaultId: 0,
    cancelId: 1,
  });
  if (response === 0) autoUpdater.quitAndInstall(true, true);
}

export function initUpdater(windowGetter: () => BrowserWindow | null): void {
  getWindow = windowGetter;
  if (!app.isPackaged || started) return;
  started = true;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = {
    info: (...a: unknown[]) => log("info", ...a),
    warn: (...a: unknown[]) => log("warn", ...a),
    error: (...a: unknown[]) => log("eroare", ...a),
    debug: () => undefined,
  };

  autoUpdater.on("update-available", (info) => {
    if (manualCheck) {
      manualCheck = false;
      void showBox({
        type: "info",
        title: "Actualizare",
        message: `Se descarcă versiunea ${info.version}.`,
        detail: "Îți spun când e gata de instalat. Poți lucra în continuare.",
      });
    }
  });
  autoUpdater.on("update-not-available", () => {
    if (manualCheck) {
      manualCheck = false;
      void showBox({ type: "info", title: "Actualizare", message: `Ai cea mai nouă versiune (${app.getVersion()}).` });
    }
  });
  autoUpdater.on("error", (err) => {
    log("eroare", err);
    if (manualCheck) {
      manualCheck = false;
      void showBox({
        type: "warning",
        title: "Actualizare",
        message: "Nu am putut verifica actualizările.",
        detail: "Verifică conexiunea la internet și încearcă din nou mai târziu.",
      });
    }
  });
  autoUpdater.on("update-downloaded", (info) => {
    if (downloadedVersion === info.version) return;
    downloadedVersion = info.version;
    void askToRestart(info);
  });

  const check = () => void autoUpdater.checkForUpdates().catch((e: unknown) => log("eroare", e));
  setTimeout(check, 15_000);
  setInterval(check, CHECK_EVERY_MS);
}

/** Din meniul Ajutor → Caută actualizări. */
export function checkForUpdatesManually(): void {
  if (!app.isPackaged) {
    void showBox({ type: "info", title: "Actualizare", message: "Actualizările funcționează doar în programul instalat." });
    return;
  }
  if (downloadedVersion) {
    void askToRestart({ version: downloadedVersion } as UpdateInfo);
    return;
  }
  manualCheck = true;
  void autoUpdater.checkForUpdates().catch((e: unknown) => {
    manualCheck = false;
    log("eroare", e);
  });
}
