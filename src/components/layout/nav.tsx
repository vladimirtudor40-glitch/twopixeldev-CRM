"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, LayoutDashboard, Layers, List, Upload, Users } from "lucide-react";
import { categoryHref, LEAD_CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Panou", icon: LayoutDashboard, exact: true },
  { href: "/leaduri", label: "Lead-uri", icon: List },
  // Import nu apare în meniul lateral: pe desktop e în Fișier → Importă..., pe mobil în bara de jos.
  { href: "/import", label: "Import", icon: Upload, adminOnly: true, sidebar: false },
  { href: "/utilizatori", label: "Utilizatori", icon: Users, adminOnly: true },
];

const isActive = (path: string, i: (typeof ITEMS)[number]) =>
  i.exact ? path === i.href : path.startsWith(i.href) || (i.href === "/leaduri" && path.startsWith("/categorii"));

const itemClass = (active: boolean) =>
  cn(
    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-muted hover:bg-navy-800 hover:text-ink",
    "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-gold",
    active && "bg-navy-700 text-ink [&>svg]:text-gold",
  );

/**
 * „Lead-uri” cu sub-categorii: numele duce la lista cu toate categoriile, chevron-ul deschide/închide
 * sub-meniul. Sub-categoriile sunt aceeași listă, filtrată pe categorie (?categorie=…).
 */
function LeadsGroup({ item, path }: { item: (typeof ITEMS)[number]; path: string }) {
  const sp = useSearchParams();
  const inGroup = isActive(path, item);
  const [open, setOpen] = useState(inGroup);
  useEffect(() => { if (inGroup) setOpen(true); }, [inGroup]);
  const onList = path.startsWith("/leaduri");
  const onListPage = path === "/leaduri";
  const category = onListPage ? (sp.get("categorie") ?? "") : null;
  const subItems = [
    { key: "toate", href: "/leaduri", label: "Toate", icon: Layers, active: category === "" },
    ...LEAD_CATEGORIES.map((c) => ({ key: c.slug, href: categoryHref(c.value), label: c.label, icon: c.icon, active: category === c.value })),
  ];

  return (
    <div>
      <div className={cn("group relative flex items-center rounded-lg", inGroup && "bg-navy-700")}>
        <Link href={item.href} aria-current={onList ? "page" : undefined} className={cn(itemClass(false), "min-w-0 flex-1 pr-10", inGroup && "text-ink hover:bg-transparent [&>svg]:text-gold")}>
          <item.icon size={17} aria-hidden />
          {item.label}
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="nav-lead-categorii"
          aria-label={open ? "Ascunde categoriile de lead-uri" : "Arată categoriile de lead-uri"}
          className={cn(
            "absolute right-1 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:bg-navy-600 hover:text-ink",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold",
          )}
        >
          <ChevronDown size={16} aria-hidden className={cn("transition-transform duration-200", open && "rotate-180")} />
        </button>
      </div>
      <div
        id="nav-lead-categorii"
        className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}
        inert={!open}
      >
        <ul className="ml-[1.3rem] mt-0.5 flex min-h-0 flex-col gap-0.5 overflow-hidden border-l border-navy-600 pl-2.5">
          {subItems.map((c) => (
            <li key={c.key}>
              <Link href={c.href} aria-current={c.active ? "page" : undefined} className={cn(itemClass(c.active), "py-1.5 text-[17px]")}>
                <c.icon size={15} aria-hidden />
                {c.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Navigare" className="flex flex-col gap-0.5">
      {ITEMS.filter((i) => (!i.adminOnly || isAdmin) && i.sidebar !== false).map((i) => {
        if (i.href === "/leaduri") return <LeadsGroup key={i.href} item={i} path={path} />;
        const active = isActive(path, i);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
            <i.icon size={17} aria-hidden />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  const items = ITEMS.filter((i) => !i.adminOnly || isAdmin);
  return (
    <nav
      aria-label="Navigare"
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-navy-600 bg-[#0C1D30] pb-[env(safe-area-inset-bottom)] md:hidden"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((i) => {
        const active = isActive(path, i);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[15px] text-ink-muted", active && "text-gold")}>
            <i.icon size={20} aria-hidden />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
