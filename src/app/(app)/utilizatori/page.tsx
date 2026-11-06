import type { Metadata } from "next";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { UserCreateForm, UserEditForm } from "@/components/users/user-forms";
import { ROLE_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { cn, formatDateTime } from "@/lib/utils";
import { canManageUsers } from "@/server/permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Utilizatori" };

export default async function UsersPage() {
  const me = await requireUser();
  if (!canManageUsers(me)) {
    return (<><PageHeader title="Utilizatori" /><p className="text-sm text-ink-muted">Doar administratorii pot gestiona utilizatorii.</p></>);
  }
  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, phone: true, role: true, active: true, lastLoginAt: true, _count: { select: { ownedLeads: true } } },
  });

  return (
    <>
      <PageHeader title="Utilizatori">
        <p className="mt-1 max-w-2xl text-sm text-ink-muted">
          Conturile colegilor care lucrează în CRM. Adminii văd și modifică tot, importă lead-uri și gestionează conturile;
          agenții de vânzări lucrează pe lead-urile lor și pe cele fără responsabil.
        </p>
      </PageHeader>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel>
          <h2 className="mb-3 font-display text-base font-bold">Conturi ({users.length})</h2>
          <ul className="flex flex-col gap-2">
            {users.map((u) => (
              <li key={u.id}>
                <details className="group rounded-lg border border-navy-600 bg-navy">
                  <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5 [&::-webkit-details-marker]:hidden">
                    <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold", u.active ? "bg-gold text-navy" : "bg-navy-700 text-ink-muted")}>
                      {(u.name || u.email).slice(0, 1).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {u.name || u.email}
                        {u.id === me.id && <span className="ml-2 text-xs font-normal text-ink-muted">(tu)</span>}
                      </span>
                      <span className="block truncate text-xs text-ink-muted">{u.email}</span>
                    </span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", u.role === "ADMIN" ? "border-gold/50 text-gold" : "border-teal/50 text-teal-hi")}>
                      {ROLE_LABEL[u.role]}
                    </span>
                    {!u.active && <span className="rounded-full border border-danger/50 px-2 py-0.5 text-[11px] font-semibold text-[#F2A49D]">Dezactivat</span>}
                    <span className="w-full text-[11px] text-ink-muted sm:w-auto">
                      {u._count.ownedLeads} lead-uri · ultima autentificare: {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "niciodată"}
                    </span>
                    <span className="text-xs text-teal-hi group-open:hidden">Editează</span>
                    <span className="hidden text-xs text-ink-muted group-open:inline">Închide</span>
                  </summary>
                  <div className="border-t border-navy-600 px-3 py-3">
                    <UserEditForm user={{ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role, active: u.active }} isSelf={u.id === me.id} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel className="self-start">
          <h2 className="mb-3 font-display text-base font-bold">Adaugă un utilizator</h2>
          <UserCreateForm />
        </Panel>
      </div>
    </>
  );
}
