"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Check, ChevronDown, Search, X } from "lucide-react";
import { PRIORITIES, STAGES, STAGE_LABEL, TYPES, TYPE_LABEL, WEBSITE_LABEL, WEBSITE_STATUSES, ZONES, ZONE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { deleteView, saveView } from "@/server/actions/views";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

type View = { id: string; name: string; query: string; mine: boolean };

function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border border-navy-600 px-2.5 py-1 text-xs text-ink-muted hover:border-teal",
        pressed && "border-teal bg-teal/15 text-ink",
      )}
    >
      {children}
    </button>
  );
}


/**
 * Buton de filtru din toolbar: arată categoria (ex. „Zonă”) cu chevron; la click deschide
 * un popover cu opțiunile. Popover-ul e deasupra tabelului (z-40) și se închide la click
 * în afară sau la Escape.
 */
function FilterDropdown({ id, label, count, open, onOpenChange, children, wide }: {
  id: string;
  label: string;
  count: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [alignRight, setAlignRight] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onOpenChange(false);
        rootRef.current?.querySelector<HTMLButtonElement>("button[aria-haspopup]")?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  // Dacă meniul ar ieși din fereastră în dreapta, îl aliniem la marginea dreaptă a butonului.
  useLayoutEffect(() => {
    if (!open) { setAlignRight(false); return; }
    const root = rootRef.current;
    const panel = panelRef.current;
    if (!root || !panel) return;
    const left = root.getBoundingClientRect().left;
    setAlignRight(left + panel.offsetWidth > document.documentElement.clientWidth - 8);
  }, [open]);

  const active = count > 0;
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={`filtru-${id}`}
        onClick={() => onOpenChange(!open)}
        className={cn(
          "inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-xs font-semibold transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
          active ? "border-teal bg-teal/15 text-ink" : "border-navy-600 bg-navy-700 text-ink hover:border-teal",
          open && "border-teal",
        )}
      >
        {label}
        {active && (
          <span className="tabular rounded-full bg-teal px-1.5 text-[13px] leading-5 text-white" aria-label={`${count} ${count === 1 ? "selectat" : "selectate"}`}>
            {count}
          </span>
        )}
        <ChevronDown size={15} aria-hidden className={cn("text-ink-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          ref={panelRef}
          id={`filtru-${id}`}
          role="group"
          aria-label={label}
          className={cn(
            "absolute top-full z-40 mt-1.5 max-h-[60vh] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-navy-600 bg-navy-800 p-1.5 shadow-xl shadow-black/40",
            wide ? "w-80" : "min-w-[15rem]",
            alignRight ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function OptionItem({ checked, onClick, children }: { checked: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-ink hover:bg-navy-700",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-gold",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-[18px] shrink-0 items-center justify-center rounded border",
          checked ? "border-teal bg-teal text-white" : "border-navy-600 bg-navy",
        )}
      >
        {checked && <Check size={13} strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

export function LeadFilters({ views, users }: { views: View[]; users: { id: string; name: string | null; email: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [viewName, setViewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = (next: URLSearchParams) => {
    next.delete("pagina");
    const s = next.toString();
    startTransition(() => router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false }));
  };
  const set = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    push(next);
  };
  const toggle = (key: string, value: string) => {
    const cur = (sp.get(key) ?? "").split(",").filter(Boolean);
    const nextVals = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
    set(key, nextVals.join(","));
  };
  const has = (key: string, value: string) => (sp.get(key) ?? "").split(",").includes(value);

  useEffect(() => {
    if ((sp.get("q") ?? "") === q) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => set("q", q.trim() || null), 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const current = new URLSearchParams(sp.toString());
  current.delete("pagina");
  const currentQuery = current.toString();
  const anyFilter = currentQuery.length > 0;

  const values = (key: string) => (sp.get(key) ?? "").split(",").filter(Boolean);
  const menu = (id: string) => ({
    id,
    open: openMenu === id,
    onOpenChange: (o: boolean) => setOpenMenu(o ? id : null),
  });

  const multi = (id: string, label: string, k: string, options: [string, string][]) => (
    <FilterDropdown key={id} label={label} count={values(k).length} {...menu(id)}>
      {options.map(([v, l]) => <OptionItem key={v} checked={has(k, v)} onClick={() => toggle(k, v)}>{l}</OptionItem>)}
      {values(k).length > 0 && (
        <button type="button" onClick={() => set(k, null)}
          className="mt-1 w-full rounded-lg border-t border-navy-600 px-2.5 pb-1 pt-2 text-left text-xs text-ink-muted hover:text-ink">
          Golește „{label}”
        </button>
      )}
    </FilterDropdown>
  );

  const OTHER_KEYS = ["telefon", "ultima", "responsabil", "optout", "arhivate"];
  const otherCount = OTHER_KEYS.filter((k) => sp.get(k)).length;

  return (
    <div className={cn("mb-4 flex flex-col gap-3", pending && "opacity-80")}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
        <Input
          id="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Caută după nume, adresă, telefon, email, operator, persoană… (merge și fără diacritice)"
          className="pl-9"
          aria-label="Caută lead-uri"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Filtre lead-uri">
        {multi("zona", "Zonă", "zona", ZONES.map((z) => [z, ZONE_LABEL[z]]))}
        {multi("prioritate", "Prioritate", "prioritate", PRIORITIES.map((p) => [p, p === "A" ? "A · de sunat" : p === "B" ? "B · de verificat" : "C · are site"]))}
        {multi("site", "Status site", "site", WEBSITE_STATUSES.map((w) => [w, WEBSITE_LABEL[w]]))}
        {multi("etapa", "Etapă", "etapa", STAGES.map((st) => [st, STAGE_LABEL[st]]))}
        {multi("tip", "Tip", "tip", TYPES.map((t) => [t, TYPE_LABEL[t]]))}
        <FilterDropdown label="Altele" count={otherCount} wide {...menu("altele")}>
          <div className="flex flex-col gap-2 p-1.5">
            <Select aria-label="Telefon" value={sp.get("telefon") ?? ""} onChange={(e) => set("telefon", e.target.value || null)}>
              <option value="">Telefon: oricare</option>
              <option value="da">Are telefon</option>
              <option value="nu">Fără telefon</option>
            </Select>
            <Select aria-label="Ultima interacțiune" value={sp.get("ultima") ?? ""} onChange={(e) => set("ultima", e.target.value || null)}>
              <option value="">Ultima interacțiune: oricând</option>
              <option value="niciodata">Niciodată contactate</option>
              <option value="14">Necontactate de 14+ zile</option>
              <option value="30">Necontactate de 30+ zile</option>
            </Select>
            <Select aria-label="Responsabil" value={sp.get("responsabil") ?? ""} onChange={(e) => set("responsabil", e.target.value || null)}>
              <option value="">Responsabil: oricine</option>
              <option value="eu">Ale mele</option>
              <option value="liber">Fără responsabil</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </Select>
            <Select aria-label="Nu mai contacta" value={sp.get("optout") ?? ""} onChange={(e) => set("optout", e.target.value || null)}>
              <option value="">Opt-out: toate</option>
              <option value="ascunde">Ascunde „Nu mai contacta”</option>
              <option value="doar">Doar „Nu mai contacta”</option>
            </Select>
            <Select aria-label="Arhivă" value={sp.get("arhivate") ?? ""} onChange={(e) => set("arhivate", e.target.value || null)}>
              <option value="">Active</option>
              <option value="da">Arhivate</option>
            </Select>
          </div>
        </FilterDropdown>

        {anyFilter && <span aria-hidden className="mx-1 h-6 w-px bg-navy-600" />}
        {anyFilter && (
          <Button size="sm" variant="ghost" onClick={() => { setQ(""); push(new URLSearchParams()); }}>
            <X size={13} />Șterge filtrele
          </Button>
        )}
        {anyFilter && (
          saving ? (
            <form
              className="flex items-center gap-1.5"
              onSubmit={async (e) => {
                e.preventDefault();
                const r = await saveView({ name: viewName, query: currentQuery });
                setMsg(r.ok ? r.message ?? null : r.error);
                if (r.ok) { setSaving(false); setViewName(""); router.refresh(); }
              }}
            >
              <Input id="view-name" autoFocus value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="Numele vederii" className="h-10 w-56" />
              <Button size="sm" type="submit" variant="primary">Salvează</Button>
              <Button size="sm" variant="ghost" onClick={() => setSaving(false)}>Renunță</Button>
            </form>
          ) : (
            <Button size="sm" onClick={() => { setMsg(null); setSaving(true); }}><Bookmark size={13} />Salvează vederea</Button>
          )
        )}
        {msg && <span className="text-xs text-ink-muted" role="status">{msg}</span>}
      </div>
      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Vederi salvate">
          <span className="w-full text-[15px] font-semibold uppercase tracking-[0.06em] text-ink-muted sm:w-24 sm:shrink-0">Vederi</span>
          {views.map((v) => (
            <span key={v.id} className="inline-flex items-center">
              <Chip pressed={currentQuery === v.query} onClick={() => { setQ(new URLSearchParams(v.query).get("q") ?? ""); push(new URLSearchParams(v.query)); }}>
                <Bookmark size={11} className="mr-1 inline" aria-hidden />{v.name}
              </Chip>
              {v.mine && (
                <button type="button" aria-label={`Șterge vederea ${v.name}`} className="ml-0.5 rounded p-0.5 text-ink-muted hover:text-ink"
                  onClick={async () => { await deleteView(v.id); router.refresh(); }}>
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
