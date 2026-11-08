import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { BottomNav, SideNav } from "@/components/layout/nav";
import { ROLE_LABEL } from "@/lib/labels";
import { logoutAction } from "@/server/actions/auth";
import { requireUser } from "@/server/session";
import { asset, WEB_MODE } from "@/lib/web";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const initials = (user.name || user.email || "?").split(/[\s@.]/).filter(Boolean).slice(0, 2).map((x) => x[0]!.toUpperCase()).join("");
  // În site (versiunea web), logo-ul, contul și ieșirea sunt deja în bara de sus a site-ului.
  if (WEB_MODE) {
    return (
      <div className="md:grid md:min-h-dvh md:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-5 border-r border-navy-600 px-3.5 py-5 md:flex">
          <Link href="/" className="block px-2.5">
            <span className="block text-[13px] font-semibold uppercase tracking-[0.18em] text-teal">CRM vânzări</span>
            <span className="mt-0.5 block text-[13px] text-ink-muted">lead-uri · pipeline · import</span>
          </Link>
          <SideNav isAdmin={isAdmin} />
          <div className="mt-auto flex items-center gap-2.5 border-t border-navy-600 px-1 pt-3.5 text-sm">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold text-[13px] font-bold text-on-gold">{initials}</span>
            <div className="min-w-0 flex-1 text-[15px] leading-5">
              <div className="truncate">{user.name || user.email}</div>
              <div className="text-[13px] text-ink-muted">{ROLE_LABEL[user.role]}</div>
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <main className="px-4 pb-24 pt-5 md:px-7 md:pb-10 md:pt-6">{children}</main>
        </div>
        <BottomNav isAdmin={isAdmin} />
      </div>
    );
  }
  return (
    <div className="md:grid md:min-h-dvh md:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-navy-600 bg-gradient-to-b from-navy-900 to-navy px-3.5 py-5 md:flex">
        <Link href="/" className="block px-1">
          <Image src={asset("/brand/twopixeldev-logo.png")} alt="twopixeldev" width={170} height={24} priority className="h-auto w-[170px]" />
          <span className="mt-1.5 block text-[15px] font-semibold uppercase tracking-[0.18em] text-gold">CRM vânzări</span>
        </Link>
        <SideNav isAdmin={isAdmin} />
        <div className="mt-auto flex items-center gap-2.5 border-t border-navy-600 pt-3.5 text-sm">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gold text-xs font-bold text-on-gold">{initials}</span>
          <div className="min-w-0 flex-1">
            <div className="truncate">{user.name || user.email}</div>
            <div className="text-[15px] text-ink-muted">{ROLE_LABEL[user.role]}</div>
          </div>
          <form action={logoutAction}>
            <button type="submit" title="Ieși din cont" aria-label="Ieși din cont" className="rounded-md p-1.5 text-ink-muted hover:bg-navy-800 hover:text-ink">
              <LogOut size={16} />
            </button>
          </form>
        </div>
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-navy-600 bg-navy/95 px-4 py-3 backdrop-blur md:hidden">
          <Link href="/"><Image src={asset("/brand/twopixeldev-logo.png")} alt="twopixeldev" width={132} height={19} className="h-auto w-[132px]" /></Link>
          <form action={logoutAction}>
            <button type="submit" className="flex items-center gap-1.5 text-xs text-ink-muted"><LogOut size={14} />Ieși</button>
          </form>
        </header>
        <main className="px-4 pb-24 pt-5 md:px-7 md:pb-10 md:pt-6">{children}</main>
      </div>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}
