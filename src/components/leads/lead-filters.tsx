"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Search, X } from "lucide-react";
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

export function LeadFilters({ views, users }: { views: View[]; users: { id: string; name: string | null; email: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [viewName, setViewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
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
  const activeCount = [...current.keys()].filter((k) => !["q", "sort", "dir"].includes(k)).length;

  const Group = ({ label, k, options }: { label: string; k: string; options: [string, string][] }) => (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={label}>
      <span className="w-full text-[15px] font-semibold uppercase tracking-[0.06em] text-ink-muted sm:w-24 sm:shrink-0">{label}</span>
      {options.map(([v, l]) => <Chip key={v} pressed={has(k, v)} onClick={() => toggle(k, v)}>{l}</Chip>)}
    </div>
  );

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

      <Button size="sm" className="self-start md:hidden" aria-expanded={showFilters} aria-controls="lead-filter-groups" onClick={() => setShowFilters((v) => !v)}>
        {showFilters ? "Ascunde filtrele" : `Filtre${activeCount ? ` (${activeCount} ${activeCount === 1 ? "activ" : "active"})` : ""}`}
      </Button>
      <div id="lead-filter-groups" className={cn("flex-col gap-3 md:flex", showFilters ? "flex" : "hidden")}>
      <Group label="Zonă" k="zona" options={ZONES.map((z) => [z, ZONE_LABEL[z]])} />
      <Group label="Prioritate" k="prioritate" options={PRIORITIES.map((p) => [p, p === "A" ? "A · de sunat" : p === "B" ? "B · de verificat" : "C · are site"])} />
      <Group label="Status site" k="site" options={WEBSITE_STATUSES.map((w) => [w, WEBSITE_LABEL[w]])} />
      <Group label="Etapă" k="etapa" options={STAGES.map((s) => [s, STAGE_LABEL[s]])} />
      <Group label="Tip" k="tip" options={TYPES.map((t) => [t, TYPE_LABEL[t]])} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="w-full text-[15px] font-semibold uppercase tracking-[0.06em] text-ink-muted sm:w-24 sm:shrink-0">Altele</span>
        <Select aria-label="Telefon" className="w-auto" value={sp.get("telefon") ?? ""} onChange={(e) => set("telefon", e.target.value || null)}>
          <option value="">Telefon: oricare</option>
          <option value="da">Are telefon</option>
          <option value="nu">Fără telefon</option>
        </Select>
        <Select aria-label="Ultima interacțiune" className="w-auto" value={sp.get("ultima") ?? ""} onChange={(e) => set("ultima", e.target.value || null)}>
          <option value="">Ultima interacțiune: oricând</option>
          <option value="niciodata">Niciodată contactate</option>
          <option value="14">Necontactate de 14+ zile</option>
          <option value="30">Necontactate de 30+ zile</option>
        </Select>
        <Select aria-label="Responsabil" className="w-auto" value={sp.get("responsabil") ?? ""} onChange={(e) => set("responsabil", e.target.value || null)}>
          <option value="">Responsabil: oricine</option>
          <option value="eu">Ale mele</option>
          <option value="liber">Fără responsabil</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
        </Select>
        <Select aria-label="Nu mai contacta" className="w-auto" value={sp.get("optout") ?? ""} onChange={(e) => set("optout", e.target.value || null)}>
          <option value="">Opt-out: toate</option>
          <option value="ascunde">Ascunde „Nu mai contacta”</option>
          <option value="doar">Doar „Nu mai contacta”</option>
        </Select>
        <Select aria-label="Arhivă" className="w-auto" value={sp.get("arhivate") ?? ""} onChange={(e) => set("arhivate", e.target.value || null)}>
          <option value="">Active</option>
          <option value="da">Arhivate</option>
        </Select>
      </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
    </div>
  );
}
