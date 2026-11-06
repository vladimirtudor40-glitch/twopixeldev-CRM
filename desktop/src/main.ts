/**
 * twopixeldev CRM pentru Windows.
 * Procesul principal: fereastra, meniul în română, configurarea la prima pornire,
 * actualizarea bazei de date și serverul local al aplicației.
 */
import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell, type IpcMainInvokeEvent, type MenuItemConstructorOptions } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadConfig, maskDatabaseUrl, saveDatabaseUrl } from "./config";
import { createFirstAdmin, inspectDatabase, migrateDatabase, normalizeDatabaseUrl, SetupError, validateAdmin } from "./db-setup";
import { logsDir, migrationsDir } from "./paths";
import type { DesktopState, Result, StartStatus } from "./preload";
import { serverUrl, startServer, stopServer } from "./server";
import { checkForUpdatesManually, initUpdater } from "./updater";

const APP_NAME = "twopixeldev CRM";
const EXTERNAL_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:", "sms:", "whatsapp:", "geo:"]);

app.setName(APP_NAME);
if (process.platform === "win32") app.setAppUserModelId("ro.twopixeldev.crm");

let mainWindow: BrowserWindow | null = null;
let startStatus: StartStatus = { text: "Pornesc…" };
let setupNotice = "";
let bootRun = 0;
let quitting = false;

const pageUrl = (file: string) => pathToFileURL(path.join(__dirname, file)).toString();

function errorMessage(e: unknown): string {
  if (e instanceof SetupError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}

function isInternalUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol === "file:") {
      const rel = path.relative(path.resolve(__dirname), path.resolve(fileURLToPath(u)));
      return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
    }
    const base = serverUrl();
    return !!base && u.origin === new URL(base).origin;
  } catch {
    return false;
  }
}

function openExternal(raw: string): void {
  try {
    const u = new URL(raw);
    if (EXTERNAL_PROTOCOLS.has(u.protocol)) void shell.openExternal(u.toString());
  } catch {
    // adresă invalidă: o ignorăm
  }
}

function setStartStatus(s: StartStatus): void {
  startStatus = s;
  mainWindow?.webContents.send("crm:start-status", s);
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1360,
    height: 880,
    minWidth: 380,
    minHeight: 560,
    show: false,
    title: APP_NAME,
    backgroundColor: "#0A1828",
    icon: path.join(__dirname, "icon.png"),
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: true,
    },
  });
  win.once("ready-to-show", () => win.show());
  win.webContents.session.setSpellCheckerLanguages(["ro", "en-US"]);

  // Linkurile externe (site-uri, Google Maps, WhatsApp, telefon, email) se deschid în programele laptopului
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isInternalUrl(url)) {
      void win.loadURL(url);
    } else {
      openExternal(url);
    }
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      openExternal(url);
    }
  });
  win.webContents.on("will-redirect", (event, url) => {
    if (!isInternalUrl(url)) {
      event.preventDefault();
      openExternal(url);
    }
  });
  win.webContents.on("render-process-gone", () => {
    if (!quitting) void boot();
  });
  win.on("closed", () => {
    if (mainWindow === win) mainWindow = null;
  });
  return win;
}

function getWindow(): BrowserWindow {
  if (!mainWindow || mainWindow.isDestroyed()) mainWindow = createWindow();
  return mainWindow;
}

async function showSetup(notice = ""): Promise<void> {
  setupNotice = notice;
  await getWindow().loadURL(pageUrl("setup.html"));
}

/** Pornirea normală: verifică baza, aplică migrările noi, pornește serverul și deschide aplicația. */
async function boot(): Promise<void> {
  const run = ++bootRun;
  const config = loadConfig();
  if (!config) {
    await stopServer();
    await showSetup();
    return;
  }
  const win = getWindow();
  startStatus = { text: "Mă conectez la baza de date…" };
  await win.loadURL(pageUrl("start.html"));
  try {
    const status = await inspectDatabase(config.databaseUrl, migrationsDir());
    if (run !== bootRun) return;
    if (status.pendingMigrations > 0) {
      setStartStatus({ text: "Actualizez structura bazei de date…" });
      await migrateDatabase(config.databaseUrl, migrationsDir(), (line) => setStartStatus({ text: line }));
    }
    if (status.userCount === 0) {
      await showSetup("Baza de date nu are niciun utilizator. Creează contul de administrator.");
      return;
    }
    setStartStatus({ text: "Pornesc aplicația…" });
    const url = serverUrl() ?? (await startServer(config));
    if (run !== bootRun) return;
    await win.loadURL(`${url}/`);
  } catch (e) {
    if (run !== bootRun) return;
    setStartStatus({ text: "Programul nu a putut porni.", error: errorMessage(e) });
  }
}

function fromLocalPage(event: IpcMainInvokeEvent): boolean {
  return event.senderFrame?.url.startsWith("file:") === true && isInternalUrl(event.senderFrame.url);
}

function handle<A extends unknown[], R>(channel: string, fn: (event: IpcMainInvokeEvent, ...args: A) => Promise<R> | R): void {
  ipcMain.handle(channel, (event, ...args) => {
    if (!fromLocalPage(event)) throw new Error("Acces refuzat.");
    return fn(event, ...(args as A));
  });
}

function registerIpc(): void {
  handle("crm:state", (): DesktopState => {
    const cfg = loadConfig();
    return {
      hasConfig: !!cfg,
      maskedUrl: cfg ? maskDatabaseUrl(cfg.databaseUrl) : "",
      version: app.getVersion(),
      needsAdmin: setupNotice !== "",
      notice: setupNotice,
    };
  });

  handle("crm:test", async (_e, raw: string): Promise<Result<Awaited<ReturnType<typeof inspectDatabase>>>> => {
    try {
      const saved = loadConfig();
      const url = raw.trim() ? normalizeDatabaseUrl(raw) : saved?.databaseUrl;
      if (!url) throw new SetupError("Lipește adresa bazei de date (connection string).");
      return { ok: true, data: await inspectDatabase(url, migrationsDir()) };
    } catch (e) {
      return { ok: false, error: errorMessage(e) };
    }
  });

  handle(
    "crm:save",
    async (event, input: { url: string; admin: { name: string; email: string; password: string } | null }): Promise<Result<null>> => {
      const log = (line: string) => event.sender.send("crm:setup-log", line);
      try {
        const saved = loadConfig();
        const url = input.url.trim() ? normalizeDatabaseUrl(input.url) : saved?.databaseUrl;
        if (!url) throw new SetupError("Lipește adresa bazei de date (connection string).");
        log("Verific conexiunea…");
        const status = await inspectDatabase(url, migrationsDir());
        if (status.userCount === 0) {
          if (!input.admin) throw new SetupError("Completează datele contului de administrator.");
          validateAdmin(input.admin);
        }
        if (status.pendingMigrations > 0) {
          log("Creez tabelele în baza de date…");
          await migrateDatabase(url, migrationsDir(), log);
        }
        if (status.userCount === 0 && input.admin) {
          log("Creez contul de administrator…");
          const r = await createFirstAdmin(url, input.admin);
          if (r === "exista") log("Baza avea deja utilizatori; contul nou nu a mai fost creat.");
        }
        const changedDb = saved?.databaseUrl !== url;
        saveDatabaseUrl(url);
        if (changedDb) await stopServer();
        setupNotice = "";
        log("Gata. Pornesc aplicația…");
        setTimeout(() => void boot(), 400);
        return { ok: true, data: null };
      } catch (e) {
        return { ok: false, error: errorMessage(e) };
      }
    },
  );

  handle("crm:cancel", () => {
    setupNotice = "";
    void boot();
  });
  handle("crm:retry", () => void boot());
  handle("crm:open-setup", () => void showSetup());
  handle("crm:open-logs", async () => {
    fs.mkdirSync(logsDir(), { recursive: true });
    await shell.openPath(logsDir());
  });
  handle("crm:start-status", () => startStatus);
}

function buildMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: "Fișier",
      submenu: [
        {
          label: "Pagina principală",
          accelerator: "CmdOrCtrl+Shift+H",
          click: () => {
            const url = serverUrl();
            if (url) void getWindow().loadURL(`${url}/`);
            else void boot();
          },
        },
        { label: "Reîncarcă", accelerator: "CmdOrCtrl+R", click: () => getWindow().webContents.reload() },
        { type: "separator" },
        {
          // Același ecran ca fostul buton „Import” din meniul lateral (doar pentru administratori).
          label: "Importă...",
          accelerator: "CmdOrCtrl+I",
          click: () => {
            const url = serverUrl();
            if (url) void getWindow().loadURL(`${url}/import`);
            else void boot();
          },
        },
        { type: "separator" },
        { label: "Conexiunea la baza de date…", click: () => void showSetup() },
        {
          label: "Deschide folderul cu jurnale",
          click: () => {
            fs.mkdirSync(logsDir(), { recursive: true });
            void shell.openPath(logsDir());
          },
        },
        { type: "separator" },
        { label: "Ieșire", accelerator: "Alt+F4", role: "quit" },
      ],
    },
    {
      label: "Editare",
      submenu: [
        { label: "Anulează", role: "undo" },
        { label: "Refă", role: "redo" },
        { type: "separator" },
        { label: "Taie", role: "cut" },
        { label: "Copiază", role: "copy" },
        { label: "Lipește", role: "paste" },
        { label: "Selectează tot", role: "selectAll" },
      ],
    },
    {
      label: "Vizualizare",
      submenu: [
        {
          label: "Înapoi",
          accelerator: "Alt+Left",
          click: () => {
            const nav = getWindow().webContents.navigationHistory;
            if (nav.canGoBack()) nav.goBack();
          },
        },
        {
          label: "Înainte",
          accelerator: "Alt+Right",
          click: () => {
            const nav = getWindow().webContents.navigationHistory;
            if (nav.canGoForward()) nav.goForward();
          },
        },
        { type: "separator" },
        { label: "Mărește", role: "zoomIn", accelerator: "CmdOrCtrl+=" },
        { label: "Micșorează", role: "zoomOut" },
        { label: "Mărime normală", role: "resetZoom" },
        { type: "separator" },
        { label: "Ecran complet", role: "togglefullscreen" },
        { label: "Instrumente pentru dezvoltatori", role: "toggleDevTools" },
      ],
    },
    {
      label: "Ajutor",
      submenu: [
        { label: "Caută actualizări", click: () => checkForUpdatesManually() },
        { type: "separator" },
        {
          label: `Despre ${APP_NAME}`,
          click: () =>
            void dialog.showMessageBox(getWindow(), {
              type: "info",
              title: `Despre ${APP_NAME}`,
              message: APP_NAME,
              detail: `Versiunea ${app.getVersion()}\nCRM intern twopixeldev pentru unitățile de cazare de pe litoral.\nDatele sunt păstrate în baza de date Supabase.`,
            }),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const win = mainWindow;
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.on("web-contents-created", (_e, contents) => {
    contents.on("will-attach-webview", (event) => event.preventDefault());
  });

  void app.whenReady().then(() => {
    registerIpc();
    buildMenu();
    void boot();
    initUpdater(() => mainWindow);
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) void boot();
    });
  });

  app.on("window-all-closed", () => {
    app.quit();
  });

  app.on("before-quit", (event) => {
    if (quitting) return;
    quitting = true;
    event.preventDefault();
    // salvăm sesiunea pe disc, ca să rămâi autentificat la următoarea pornire
    void session.defaultSession.cookies
      .flushStore()
      .catch(() => undefined)
      .then(() => stopServer())
      .finally(() => app.quit());
  });
}
