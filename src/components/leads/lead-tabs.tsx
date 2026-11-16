"use client";

import { createContext, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { List, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tab-uri de lucru în pagina Lead-uri.
 * - „Listă Lead-uri” e permanent și ține minte ultimul URL al listei (filtre, sortare, pagină)
 *   și poziția de scroll, ca la revenire lista să arate exact ca înainte.
 * - Orice deschidere a unei unități (/leaduri/<id>, inclusiv „Editează”) intră într-un tab
 *   cu numele unității, închis cu X. Tab-urile rămân și după reîncărcarea ferestrei (sessionStorage).
 */

const LIST_PATH = "/leaduri";
const STORAGE_KEY = "crm:lead-tabs:v1";

type Tab = { key: string; title: string; href: string };
type Stored = { tabs: Tab[]; listHref: string };

type Ctx = { setTitle: (key: string, title: string) => void };
const TabsContext = createContext<Ctx | null>(null);

/** Cheia tab-ului pentru o adresă: id-ul unității („nou” pentru Lead nou) sau null pentru listă. */
function tabKeyFor(pathname: string): string | null {
  const m = /^\/leaduri\/([^/]+)/.exec(pathname);
  return m ? decodeURIComponent(m[1]!) : null;
}

function readStored(): Stored | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Stored;
    if (!Array.isArray(v.tabs) || typeof v.listHref !== "string") return null;
    return {
      listHref: v.listHref.startsWith(LIST_PATH) ? v.listHref : LIST_PATH,
      tabs: v.tabs.filter((t) => t && typeof t.key === "string" && typeof t.href === "string" && t.href.startsWith(`${LIST_PATH}/`)),
    };
  } catch {
    return null;
  }
}

function writeStored(v: Stored) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    /* fără sessionStorage tab-urile țin doar cât e fereastra deschisă */
  }
}

function Workspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const router = useRouter();
  const search = sp.toString();
  const fullHref = search ? `${pathname}?${search}` : pathname;
  const activeKey = tabKeyFor(pathname);

  const [tabs, setTabs] = useState<Tab[]>([]);
  const [listHref, setListHref] = useState(LIST_PATH);
  const [loaded, setLoaded] = useState(false);
  const listScroll = useRef(0);
  const prevKey = useRef<string | null | undefined>(undefined);

  // Tab-urile salvate în sesiune (după o reîncărcare a ferestrei).
  useEffect(() => {
    const s = readStored();
    if (s) { setTabs(s.tabs); setListHref(s.listHref); }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeStored({ tabs, listHref });
  }, [tabs, listHref, loaded]);

  // La fiecare navigare: lista își ține minte URL-ul, o unitate își deschide/actualizează tab-ul.
  useEffect(() => {
    if (activeKey === null) {
      setListHref(fullHref);
      return;
    }
    setTabs((cur) => {
      const i = cur.findIndex((t) => t.key === activeKey);
      if (i === -1) return [...cur, { key: activeKey, title: activeKey === "nou" ? "Lead nou" : "Se încarcă…", href: fullHref }];
      if (cur[i]!.href === fullHref) return cur;
      const next = [...cur];
      next[i] = { ...next[i]!, href: fullHref };
      return next;
    });
  }, [activeKey, fullHref]);

  // Scroll-ul listei: urmărit cât timp lista e activă, refăcut când revii la ea.
  useEffect(() => {
    const onScroll = () => { if (prevKey.current === null) listScroll.current = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useLayoutEffect(() => {
    const prev = prevKey.current;
    prevKey.current = activeKey;
    if (prev === undefined || prev === activeKey) return;
    window.scrollTo(0, activeKey === null ? listScroll.current : 0);
  }, [activeKey]);

  const go = useCallback((href: string) => router.push(href, { scroll: false }), [router]);

  const close = (key: string) => {
    const i = tabs.findIndex((t) => t.key === key);
    const rest = tabs.filter((t) => t.key !== key);
    setTabs(rest);
    if (key === activeKey) {
      const neighbour = rest[i] ?? rest[i - 1];
      go(neighbour ? neighbour.href : listHref);
    }
  };

  const ctx = useMemo<Ctx>(() => ({
    setTitle: (key, title) =>
      setTabs((cur) => {
        const i = cur.findIndex((t) => t.key === key);
        if (i === -1 || cur[i]!.title === title) return cur;
        const next = [...cur];
        next[i] = { ...next[i]!, title };
        return next;
      }),
  }), []);

  // Click pe tab: navigare client-side, fără reîncărcare; Ctrl/⌘/clic mijloc rămân ale browserului.
  const onTabClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(href);
  };

  return (
    <TabsContext.Provider value={ctx}>
      <div className="-mx-4 mb-4 border-b border-navy-600 px-4 md:mx-0 md:px-0">
        <nav aria-label="Tab-uri deschise" className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:thin]">
          <TabLink
            href={listHref}
            active={activeKey === null}
            onClick={(e) => onTabClick(e, listHref)}
          >
            <List size={15} aria-hidden className="shrink-0" />
            Listă Lead-uri
          </TabLink>
          {tabs.map((t) => (
            <div key={t.key} className="group relative flex shrink-0 items-stretch">
              <TabLink href={t.href} active={t.key === activeKey} onClick={(e) => onTabClick(e, t.href)} withClose title={t.title}>
                <span className="max-w-[14rem] truncate">{t.title}</span>
              </TabLink>
              <button
                type="button"
                onClick={() => close(t.key)}
                aria-label={`Închide tab-ul ${t.title}`}
                title="Închide"
                className={cn(
                  "absolute right-1.5 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-navy-600 hover:text-ink",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
                )}
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </nav>
      </div>
      {children}
    </TabsContext.Provider>
  );
}

function TabLink({ href, active, onClick, withClose, title, children }: {
  href: string;
  active: boolean;
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  withClose?: boolean;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={title}
      aria-current={active ? "page" : undefined}
      scroll={false}
      className={cn(
        "flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-t-lg border border-b-0 px-3.5 text-sm font-semibold transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold",
        withClose && "pr-10",
        active
          ? "border-navy-600 bg-navy-800 text-ink shadow-[inset_0_2px_0_0_theme(colors.gold.DEFAULT)]"
          : "border-transparent text-ink-muted hover:bg-navy-800/60 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}

export function LeadWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <Workspace>{children}</Workspace>
    </Suspense>
  );
}

/** Pus în pagina unei unități: dă tab-ului numele unității. */
export function LeadTabTitle({ id, title }: { id: string; title: string }) {
  const ctx = useContext(TabsContext);
  useEffect(() => { ctx?.setTitle(id, title); }, [ctx, id, title]);
  return null;
}

/** Rând de tabel care, la click oriunde pe el, deschide unitatea în tab-ul ei. */
export function LeadRow({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className={cn("cursor-pointer", className)}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("a, button, input, select, textarea")) return;
        if (window.getSelection()?.toString()) return;
        router.push(href);
      }}
    >
      {children}
    </tr>
  );
}
