/**
 * Puntea dintre paginile locale ale programului (configurare / pornire) și procesul principal.
 * Paginile aplicației (servite de Next.js) nu primesc nimic de aici.
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export type DesktopState = {
  hasConfig: boolean;
  maskedUrl: string;
  version: string;
  needsAdmin: boolean;
  notice: string;
};

export type DbCheck = { serverVersion: string; pendingMigrations: number; userCount: number };

export type StartStatus = { text: string; error?: string };

const api = {
  getState: (): Promise<DesktopState> => ipcRenderer.invoke("crm:state"),
  testConnection: (url: string): Promise<Result<DbCheck>> => ipcRenderer.invoke("crm:test", url),
  saveSetup: (input: { url: string; admin: { name: string; email: string; password: string } | null }): Promise<Result<null>> =>
    ipcRenderer.invoke("crm:save", input),
  cancelSetup: (): Promise<void> => ipcRenderer.invoke("crm:cancel"),
  retry: (): Promise<void> => ipcRenderer.invoke("crm:retry"),
  openSetup: (): Promise<void> => ipcRenderer.invoke("crm:open-setup"),
  openLogs: (): Promise<void> => ipcRenderer.invoke("crm:open-logs"),
  getStartStatus: (): Promise<StartStatus> => ipcRenderer.invoke("crm:start-status"),
  onStartStatus: (cb: (s: StartStatus) => void) => {
    const listener = (_e: IpcRendererEvent, s: StartStatus) => cb(s);
    ipcRenderer.on("crm:start-status", listener);
    return () => ipcRenderer.removeListener("crm:start-status", listener);
  },
  onSetupLog: (cb: (line: string) => void) => {
    const listener = (_e: IpcRendererEvent, line: string) => cb(line);
    ipcRenderer.on("crm:setup-log", listener);
    return () => ipcRenderer.removeListener("crm:setup-log", listener);
  },
};

export type CrmDesktopApi = typeof api;

if (location.protocol === "file:") {
  contextBridge.exposeInMainWorld("crm", api);
}
