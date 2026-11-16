"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { ImportRowAction, LeadCategory } from "@prisma/client";
import { Check, Copy, Download, FolderOpen, MapPin, RefreshCw, Search, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/field";
import { LEAD_CATEGORIES } from "@/lib/categories";
import { CATEGORY_SINGULAR } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { exportNoSite, importSearchResults, openResults, startLeadSearch, stopLeadSearch } from "@/server/actions/lead-search";
import { guessCategory, type GmapsPlace } from "@/server/lead-search/gmaps";
import type { InCrm } from "@/server/lead-search/in-crm";
import type { ResultFile, SearchStatus } from "@/server/lead-search/runner";

type Filter = "fara" | "toate" | "cu";
type Imported = { action: ImportRowAction | null; leadId: string | null };

const DEPTH_HINTS: [number, string][] = [
  [1, "rapid · ~15–20 firme"], [3, "mediu · ~40–60 firme"], [5, "mai multe firme · câteva minute"],
  [8, "mult · poate dura 10+ minute"], [10, "maxim · poate dura mult"],
];
const depthHint = (v: number) => DEPTH_HINTS.reduce((h, [k, t]) => (v >= k ? t : h), DEPTH_HINTS[0]![1]);
const fmtTime = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s) % 60).padStart(2, "0")}`;
const dateFmt = new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

async function getJson<T>(what: string, extra = ""): Promise<T> {
  const r = await fetch(`/api/cauta-leaduri?ce=${what}${extra}`, { cache: "no-store" });
  const body = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(body.error || r.statusText);
  return body;
}

const IMPORTED_LABEL: Partial<Record<ImportRowAction, string>> = {
  CREAT: "importat", ACTUALIZAT: "completat", NESCHIMBAT: "exista deja", EROARE: "eroare",
};

export function LeadSearch({ canImport, outDir }: { canImport: boolean; outDir: string }) {
  const [query, setQuery] = useState("");
  const [depth, setDepth] = useState(1);
  const [email, setEmail] = useState(false);
  const [status, setStatus] = useState<SearchStatus | null>(null);
  const [files, setFiles] = useState<ResultFile[]>([]);
  const [file, setFile] = useState("");
  const [places, setPlaces] = useState<GmapsPlace[]>([]);
  const [inCrm, setInCrm] = useState<Record<number, InCrm>>({});
  const [imported, setImported] = useState<Record<number, Imported>>({});
  const [filter, setFilter] = useState<Filter>("fara");
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [category, setCategory] = useState<LeadCategory | "">("");
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, startBusy] = useTransition();
  const [importing, setImporting] = useState<"toate" | "selectate" | number | null>(null);
  const polling = useRef<ReturnType<typeof setInterval> | null>(null);
  const wasRunning = useRef(false);
  const tick = useRef(0);
  const fileRef = useRef("");

  const say = useCallback((t: string, error?: boolean) => {
    setToast({ text: t, error });
    window.setTimeout(() => setToast((cur) => (cur?.text === t ? null : cur)), error ? 6000 : 3500);
  }, []);

  const loadFiles = useCallback(async () => {
    try { setFiles(await getJson<ResultFile[]>("istoric")); } catch { /* folderul nu există încă */ }
  }, []);

  const loadResults = useCallback(async (name: string, opts: { quiet?: boolean; crm?: boolean } = {}) => {
    if (!name) return;
    try {
      const r = await getJson<{ places: GmapsPlace[]; inCrm: Record<number, InCrm> }>(
        "rezultate", `&fisier=${encodeURIComponent(name)}${opts.crm === false ? "&crm=0" : ""}`,
      );
      if (fileRef.current !== name) {
        setImported({});
        setSelected(new Set());
      }
      fileRef.current = name;
      setFile(name);
      setPlaces(r.places);
      if (opts.crm !== false) setInCrm(r.inCrm);
    } catch (e) {
      if (!opts.quiet) say(e instanceof Error ? e.message : "Nu pot citi rezultatele.", true);
    }
  }, [say]);

  const poll = useCallback(async () => {
    let s: SearchStatus;
    try { s = await getJson<SearchStatus>("stare"); } catch { return; }
    setStatus(s);
    if (!s.started) return;
    if (s.running) {
      if (fileRef.current !== s.file) await loadResults(s.file, { quiet: true, crm: false });
      else if (++tick.current % 2 === 0) await loadResults(s.file, { quiet: true, crm: false });
    } else {
      if (polling.current) clearInterval(polling.current);
      polling.current = null;
      if (wasRunning.current) {
        await loadResults(s.file, { quiet: true });
        await loadFiles();
        if (s.error) say(s.error, true);
        else if (!s.stopped) say("Căutare terminată.");
      }
    }
    wasRunning.current = s.running;
  }, [loadFiles, loadResults, say]);

  const startPolling = useCallback(() => {
    if (polling.current) clearInterval(polling.current);
    wasRunning.current = true;
    void poll();
    polling.current = setInterval(() => void poll(), 1000);
  }, [poll]);

  useEffect(() => {
    void loadFiles();
    void getJson<SearchStatus>("stare").then((s) => {
      setStatus(s);
      if (s.running) startPolling();
      else if (s.file) void loadResults(s.file, { quiet: true });
    }).catch(() => undefined);
    return () => { if (polling.current) clearInterval(polling.current); };
  }, [loadFiles, loadResults, startPolling]);

  // categoria propusă după textul căutării (o poți schimba oricând)
  useEffect(() => {
    const src = status?.query || file.replace(/^leaduri-/, "").replace(/-/g, " ");
    const g = guessCategory(src);
    if (g) setCategory((c) => c || g);
  }, [status?.query, file]);

  const running = !!status?.running;

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || running) return;
    const g = guessCategory(query);
    if (g) setCategory(g);
    startBusy(async () => {
      const r = await startLeadSearch({ query, depth, email });
      if (!r.ok) return say(r.error, true);
      fileRef.current = "";
      setPlaces([]);
      setInCrm({});
      setImported({});
      setSelected(new Set());
      setFile(r.data!.file);
      startPolling();
    });
  };

  const counts = useMemo(() => ({
    total: places.length,
    noSite: places.filter((p) => p.siteKind !== "own").length,
    phone: places.filter((p) => p.phone).length,
    email: places.filter((p) => p.emails.length).length,
    crm: places.filter((p) => inCrm[p.index]).length,
  }), [places, inCrm]);

  const visible = useMemo(() => {
    const q = text.trim().toLowerCase();
    return places.filter((p) =>
      (filter === "toate" || (filter === "fara" ? p.siteKind !== "own" : p.siteKind === "own")) &&
      (!q || `${p.title} ${p.address} ${p.category} ${p.phone}`.toLowerCase().includes(q)));
  }, [places, filter, text]);

  const allVisibleSelected = visible.length > 0 && visible.every((p) => selected.has(p.index));
  const toggleAll = () => setSelected((cur) => {
    const next = new Set(cur);
    if (allVisibleSelected) visible.forEach((p) => next.delete(p.index));
    else visible.forEach((p) => next.add(p.index));
    return next;
  });
  const toggle = (i: number) => setSelected((cur) => {
    const next = new Set(cur);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  });

  const doImport = async (indexes: number[], which: "toate" | "selectate" | number) => {
    if (!category) return say("Alege mai întâi categoria în care intră lead-urile.", true);
    if (!indexes.length) return;
    setImporting(which);
    try {
      const r = await importSearchResults({ file, indexes, category });
      if (!r.ok) return say(r.error, true);
      setImported((cur) => {
        const next = { ...cur };
        // un rând importat deja în sesiunea asta rămâne „importat”, nu devine „exista deja” la al doilea import
        for (const row of r.data!.rows) if (!next[row.index]?.action || row.action === "ACTUALIZAT") next[row.index] = { action: row.action, leadId: row.leadId };
        return next;
      });
      setSelected((cur) => {
        const next = new Set(cur);
        indexes.forEach((i) => next.delete(i));
        return next;
      });
      say(r.message ?? "Import gata.");
      void loadResults(file, { quiet: true });
    } finally {
      setImporting(null);
    }
  };

  const selectedVisible = visible.filter((p) => selected.has(p.index)).map((p) => p.index);
  // „toată lista” = rândurile afișate, fără cele importate deja din pagina asta
  const toImport = visible.filter((p) => !imported[p.index]?.action).map((p) => p.index);
  const hasResults = places.length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="flex min-w-0 flex-col gap-4">
        <section className="rounded-xl border border-navy-600 bg-navy-800 p-4">
          <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-teal-hi">Google Maps</p>
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Caută lead-uri</h1>
          <form onSubmit={onSearch} className="mt-3 flex flex-col gap-4" autoComplete="off">
            <div className="flex flex-col gap-1">
              <label htmlFor="ls-query" className="text-xs font-medium text-ink-muted">Ce cauți</label>
              <Textarea
                id="ls-query" rows={2} value={query} placeholder="frizerie Constanța" required autoFocus
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
              />
              <p className="text-xs text-ink-muted">Câte o căutare pe rând, ex. „frizerie Constanța”, „cafenea Mamaia”.</p>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="ls-depth" className="flex items-center justify-between text-xs font-medium text-ink-muted">
                Adâncime <b className="tabular text-sm text-teal-hi">{depth}</b>
              </label>
              <input id="ls-depth" type="range" min={1} max={10} value={depth} onChange={(e) => setDepth(Number(e.target.value))} className="accent-[#25A7A2]" />
              <p className="text-xs text-ink-muted">{depthHint(depth)}</p>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input type="checkbox" checked={email} onChange={(e) => setEmail(e.target.checked)} className="mt-1 size-4 accent-[#25A7A2]" />
              <span>Caută și emailuri pe site-uri <span className="text-xs text-ink-muted">(mai lent)</span></span>
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" className="flex-1" disabled={running || busy || !query.trim()}>
                <Search size={16} aria-hidden />{running ? "Caut…" : "Caută lead-uri"}
              </Button>
              {running && (
                <Button variant="danger" onClick={() => startBusy(async () => { await stopLeadSearch(); say("Căutare oprită."); })}>
                  <Square size={14} aria-hidden />Oprește
                </Button>
              )}
            </div>
          </form>
        </section>

        <section className="rounded-xl border border-navy-600 bg-navy-800 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-teal-hi">Istoric</p>
            <button type="button" onClick={() => void loadFiles()} className="flex items-center gap-1 text-xs text-ink-muted hover:text-ink">
              <RefreshCw size={13} aria-hidden />reîncarcă
            </button>
          </div>
          {files.length === 0 ? <p className="text-sm text-ink-muted">Încă nicio căutare.</p> : (
            <ul className="-mx-1 flex max-h-[420px] flex-col gap-0.5 overflow-y-auto">
              {files.map((f) => (
                <li key={f.name}>
                  <button
                    type="button" onClick={() => void loadResults(f.name)} title={f.name}
                    className={cn("w-full rounded-lg px-2.5 py-2 text-left hover:bg-navy-700", f.name === file && "bg-navy-700 ring-1 ring-teal/60")}
                  >
                    <span className="block truncate text-sm font-medium">{f.label}</span>
                    <span className="block text-xs text-ink-muted">{dateFmt.format(new Date(f.mtime))} · {Math.max(1, Math.round(f.size / 1024))} KB</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => void openResults()} className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink">
            <FolderOpen size={14} aria-hidden />Folder rezultate
          </button>
        </section>
      </aside>

      <div className="flex min-w-0 flex-col gap-4">
        {status?.started && (status.running || status.file === file) && (
          <section className="rounded-xl border border-navy-600 bg-navy-800 p-4" aria-live="polite">
            <div className="flex flex-wrap items-center gap-4">
              <span className={cn("size-3 rounded-full", running ? "animate-pulse bg-teal-hi" : status.error ? "bg-danger" : "bg-ok")} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                  {running ? "Caut pe Google Maps…" : status.error ? "Eroare" : status.stopped ? "Oprită" : "Gata"}
                </p>
                <h2 className="truncate font-display text-lg font-bold">{status.query}</h2>
              </div>
              <dl className="flex gap-6 text-center">
                <div><dt className="text-xs text-ink-muted">Găsite</dt><dd className="tabular text-xl font-bold">{status.found}</dd></div>
                <div><dt className="text-xs text-ink-muted">Timp</dt><dd className="tabular text-xl font-bold">{fmtTime(status.elapsed)}</dd></div>
              </dl>
            </div>
            {status.error && <p className="mt-2 text-sm text-[#F2A49D]">{status.error}</p>}
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-ink-muted">Jurnal</summary>
              <pre className="mt-2 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-lg bg-navy-900 p-3 font-mono text-xs text-ink-muted">{status.log.join("\n")}</pre>
            </details>
          </section>
        )}

        <section className="min-w-0 rounded-xl border border-navy-600 bg-navy-800 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-semibold uppercase tracking-[0.08em] text-teal-hi">{hasResults ? file : "Rezultate"}</p>
              <h2 className="font-display text-xl font-bold">
                {hasResults ? `${places.length} firme găsite` : running ? "Aștept primele rezultate…" : "Pornește o căutare"}
              </h2>
            </div>
            {hasResults && (
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => void openResults(file)}><FolderOpen size={14} aria-hidden />Arată CSV</Button>
                <Button size="sm" onClick={() => startBusy(async () => {
                  const r = await exportNoSite(file);
                  if (!r.ok) return say(r.error, true);
                  say(r.message ?? "Salvat.");
                  void loadFiles();
                })}><Download size={14} aria-hidden />Exportă doar fără site</Button>
              </div>
            )}
          </div>

          {!hasResults ? (
            running ? (
              <p className="py-12 text-center text-sm text-ink-muted">Firmele găsite apar aici pe măsură ce sunt citite din Google Maps.</p>
            ) : <div className="py-12 text-center text-sm text-ink-muted">
              <p>Scrie o căutare în stânga și apasă <b className="text-ink">Caută lead-uri</b>.<br />Firmele <b className="text-ink">fără site</b> sunt cele mai bune lead-uri.</p>
              <p className="mt-3 text-xs">Rezultatele se salvează în <code className="text-teal-hi">{outDir}</code>; de aici le imporți direct în CRM.</p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {[
                  ["Total", counts.total], ["Fără site propriu", counts.noSite], ["Cu telefon", counts.phone],
                  ["Cu email", counts.email], ["Deja în CRM", counts.crm],
                ].map(([l, v], i) => (
                  <div key={l} className={cn("rounded-lg border border-navy-600 bg-navy px-3 py-2", i === 1 && "border-gold/50")}>
                    <div className="text-xs text-ink-muted">{l}</div>
                    <div className={cn("tabular text-xl font-bold", i === 1 && "text-gold")}>{v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <div className="flex rounded-lg border border-navy-600 p-0.5" role="tablist" aria-label="Filtru site">
                  {([["fara", "Fără site"], ["toate", "Toate"], ["cu", "Cu site"]] as const).map(([k, l]) => (
                    <button key={k} type="button" role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
                      className={cn("rounded-md px-3 py-1.5 text-sm", filter === k ? "bg-navy-600 text-ink" : "text-ink-muted hover:text-ink")}>{l}</button>
                  ))}
                </div>
                <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder="Filtrează după nume, adresă…"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-navy-600 bg-navy px-3 text-sm placeholder:text-ink-muted/70 focus:border-teal focus:outline-none" />
              </div>

              {canImport && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 p-2.5">
                  <label htmlFor="ls-category" className="text-sm font-medium">Importă în</label>
                  <Select id="ls-category" value={category} onChange={(e) => setCategory(e.target.value as LeadCategory)} className="h-10 w-48">
                    <option value="" disabled>alege categoria…</option>
                    {LEAD_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </Select>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button size="sm" disabled={!selectedVisible.length || importing !== null} onClick={() => void doImport(selectedVisible, "selectate")}>
                      {importing === "selectate" ? "Import…" : `Importă selectate (${selectedVisible.length})`}
                    </Button>
                    <Button size="sm" variant="gold" disabled={!toImport.length || importing !== null} onClick={() => void doImport(toImport, "toate")}>
                      {importing === "toate" ? "Import…" : `Importă toată lista (${toImport.length})`}
                    </Button>
                  </div>
                </div>
              )}

              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead>
                    <tr className="text-left text-[15px] uppercase tracking-[0.06em] text-ink-muted">
                      {canImport && (
                        <th className="w-8 py-1.5 pr-2">
                          <input type="checkbox" aria-label="Selectează tot" checked={allVisibleSelected} onChange={toggleAll} className="size-4 accent-[#25A7A2]" />
                        </th>
                      )}
                      <th className="py-1.5 pr-3 font-semibold">Firmă</th>
                      <th className="py-1.5 pr-3 font-semibold">Telefon</th>
                      <th className="py-1.5 pr-3 font-semibold">Adresă</th>
                      <th className="py-1.5 pr-3 font-semibold">Site</th>
                      <th className="py-1.5 font-semibold"><span className="sr-only">Acțiuni</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.length === 0 && (
                      <tr><td colSpan={6} className="py-8 text-center text-ink-muted">Nimic de afișat pentru filtrul ales.</td></tr>
                    )}
                    {visible.map((p) => {
                      const crm = inCrm[p.index];
                      const imp = imported[p.index];
                      const leadId = imp?.leadId ?? crm?.id;
                      return (
                        <tr key={p.index} className="border-t border-navy-600 align-top">
                          {canImport && (
                            <td className="py-2.5 pr-2">
                              <input type="checkbox" aria-label={`Selectează ${p.title}`} checked={selected.has(p.index)} onChange={() => toggle(p.index)} className="mt-1 size-4 accent-[#25A7A2]" />
                            </td>
                          )}
                          <td className="min-w-[11rem] py-2.5 pr-3">
                            <div className="font-semibold">{p.title}</div>
                            <div className="text-xs text-ink-muted">
                              {p.category}
                              {p.rating ? <> · <span className="text-gold">★</span> {p.rating.toFixed(1).replace(".", ",")} ({p.reviews ?? 0})</> : null}
                            </div>
                            {p.emails.length > 0 && <div className="text-xs text-teal-hi">{p.emails.join(", ")}</div>}
                          </td>
                          <td className="whitespace-nowrap py-2.5 pr-3">
                            {p.phone ? (
                              <button type="button" title="Copiază" className="inline-flex items-center gap-1 tabular hover:text-teal-hi"
                                onClick={() => void navigator.clipboard.writeText(p.phone).then(() => say(`Telefon copiat: ${p.phone}`), () => say("Nu am putut copia", true))}>
                                {p.phone}<Copy size={12} aria-hidden className="text-ink-muted" />
                              </button>
                            ) : <span className="text-ink-muted">—</span>}
                          </td>
                          <td className="py-2.5 pr-3 text-xs text-ink-muted">{p.address}</td>
                          <td className="whitespace-nowrap py-2.5 pr-3">
                            {p.siteKind === "none" ? <span className="rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold">fără site</span> : (
                              <a href={p.website} target="_blank" rel="noreferrer" title={p.website}
                                className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", p.siteKind === "own" ? "bg-teal/20 text-teal-hi" : "bg-warn/15 text-warn")}>
                                {p.siteKind === "own" ? "are site" : `doar ${hostOf(p.website)}`}
                              </a>
                            )}
                          </td>
                          <td className="whitespace-nowrap py-2.5">
                            <div className="flex items-center justify-end gap-2">
                              {p.link && (
                                <a href={p.link} target="_blank" rel="noreferrer" title="Deschide în Google Maps" aria-label="Google Maps" className="rounded-md p-1 text-ink-muted hover:bg-navy-700 hover:text-ink">
                                  <MapPin size={16} />
                                </a>
                              )}
                              {imp?.action ? (
                                leadId ? <Link href={`/leaduri/${leadId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#7FD8B4] hover:underline"><Check size={13} aria-hidden />{IMPORTED_LABEL[imp.action] ?? imp.action}</Link>
                                  : <span className="text-xs text-[#F2A49D]">{IMPORTED_LABEL[imp.action] ?? imp.action}</span>
                              ) : crm ? (
                                <Link href={`/leaduri/${crm.id}`} title={`${crm.name} · ${CATEGORY_SINGULAR[crm.category]}`} className="text-xs font-semibold text-teal-hi hover:underline">în CRM</Link>
                              ) : null}
                              {canImport && !imp?.action && (
                                <Button size="sm" className="h-8" disabled={importing !== null} onClick={() => void doImport([p.index], p.index)}>
                                  {importing === p.index ? "…" : "Importă"}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>

      {toast && (
        <div role="status" className={cn(
          "fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg border px-4 py-2.5 text-sm shadow-xl md:bottom-6",
          toast.error ? "border-danger/60 bg-[#2A1416] text-[#F2A49D]" : "border-teal/60 bg-navy-800 text-ink",
        )}>{toast.text}</div>
      )}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return "platformă";
  }
}
