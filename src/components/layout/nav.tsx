"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, List, Upload, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Panou", icon: LayoutDashboard, exact: true },
  { href: "/leaduri", label: "Lead-uri", icon: List },
  { href: "/import", label: "Import", icon: Upload, adminOnly: true },
  { href: "/utilizatori", label: "Utilizatori", icon: Users, adminOnly: true },
];

export function SideNav({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav aria-label="Navigare" className="flex flex-col gap-0.5">
      {ITEMS.filter((i) => !i.adminOnly || isAdmin).map((i) => {
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-ink-muted hover:bg-navy-800 hover:text-ink",
              active && "bg-navy-700 text-ink [&>svg]:text-gold",
            )}
          >
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
        const active = i.exact ? path === i.href : path.startsWith(i.href);
        return (
          <Link key={i.href} href={i.href} aria-current={active ? "page" : undefined}
            className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] text-ink-muted", active && "text-gold")}>
            <i.icon size={20} aria-hidden />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
