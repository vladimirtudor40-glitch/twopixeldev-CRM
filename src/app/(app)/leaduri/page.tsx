import type { Metadata } from "next";
import Link from "next/link";
import { LeadFilters } from "@/components/leads/lead-filters";
import { LeadRow } from "@/components/leads/lead-tabs";
import { OptOutBadge, PriorityBadge, StageBadge, WebsiteBadge } from "@/components/ui/badges";
import { buttonClass } from "@/components/ui/button";
import { CATEGORY_ICON } from "@/lib/categories";
import { CATEGORY_LABEL, CATEGORY_SINGULAR, TYPE_LABEL, ZONE_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatNumber, relativeDays } from "@/lib/utils";
import { listActiveUsers, listLeads, parseLeadFilters, type LeadFilters as F } from "@/server/queries/leads";
import { requireUser, sessionUserId } from "@/server/session";

export const metadata: Metadata = { title: "Lead-uri" };

const SORT_COLUMNS: { key: F["sort"]; label: string }[] = [
  { key: "prioritate", label: "Pr." },
  { key: "nume", label: "Nume" },
  { key: "categorie", label: "Categorie" },
  { key: "zona", label: "Zonă" },
];

/** Sub-titlul rândului: tipul unității (doar la cazare) și adresa. */
const kind = (l: { category: keyof typeof CATEGORY_LABEL; type: keyof typeof TYPE_LABEL; businessType: string | null }) =>
  l.category === "HOTELURI" ? TYPE_LABEL[l.type] : l.businessType;
const subtitle = (l: Parameters<typeof kind>[0] & { address: string | null }) => [kind(l), l.address].filter(Boolean).join(" · ");

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [userId, sp] = await Promise.all([sessionUserId(), searchParams]);
  const f = parseLeadFilters(sp);
  // Toate interogările pleacă odată, inclusiv verificarea contului: un singur drum până la baza de date.
  const [user, { total, rows, pages }, users, views] = await Promise.all([
    requireUser(),
    listLeads(f, userId),
    listActiveUsers(),
    prisma.savedView.findMany({ where: { OR: [{ userId }, { isShared: true }] }, orderBy: { name: "asc" } }),
  ]);

  const qs = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (typeof v === "string") p.set(k, v);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return s ? `/leaduri?${s}` : "/leaduri";
  };
  const sortLink = (key: F["sort"]) => qs({ sort: key, dir: f.sort === key && f.dir === "asc" ? "desc" : "asc", pagina: null });
  const arrow = (key: F["sort"]) => (f.sort === key ? (f.dir === "asc" ? " ↑" : " ↓") : "");
  const ariaSort = (key: F["sort"]) => (f.sort === key ? (f.dir === "asc" ? "ascending" : "descending") : "none");

  return (
    <>
      <LeadFilters
        users={users}
        views={views.map((v) => ({
          id: v.id,
          name: v.name,
          mine: v.userId === user.id,
          query: new URLSearchParams(v.filters as Record<string, string>).toString(),
        }))}
      />
      <p className="mb-2 text-sm text-ink-muted tabular" role="status">
        {formatNumber(total)} {total === 1 ? "lead" : "lead-uri"}
        {f.categorie.length > 0 && ` · ${f.categorie.map((c) => CATEGORY_LABEL[c]).join(", ")}`}
        {pages > 1 && ` · pagina ${f.pagina} din ${pages}`}
      </p>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-navy-600 p-8 text-center text-sm text-ink-muted">
          {f.categorie.length === 1 && Object.keys(sp).length === 1 ? (
            <>
              Încă nu sunt lead-uri în categoria „{CATEGORY_LABEL[f.categorie[0]!]}”.{" "}
              <Link href={`/leaduri/nou?categorie=${f.categorie[0]}`} className="text-teal-hi underline">Adaugă primul lead</Link>.
            </>
          ) : (
            <>Niciun lead nu se potrivește filtrelor.</>
          )}{" "}
          {total === 0 && !Object.keys(sp).length && user.role === "ADMIN" && (
            <>Începe cu <Link href="/import" className="text-teal-hi underline">importul Excel</Link> din scriptul de lead-uri.</>
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-navy-600 bg-navy-800 md:block">
            <table className="w-full min-w-[1320px] border-collapse text-sm">
              <thead>
                <tr className="bg-navy-850 text-left text-[15px] uppercase tracking-[0.06em] text-ink-muted">
                  {SORT_COLUMNS.map((c) => (
                    <th key={c.key} aria-sort={ariaSort(c.key)} className="px-3 py-2.5 font-semibold">
                      <Link href={sortLink(c.key)} scroll={false}>{c.label}{arrow(c.key)}</Link>
                    </th>
                  ))}
                  <th className="px-3 py-2.5 font-semibold">Site</th>
                  <th aria-sort={ariaSort("etapa")} className="px-3 py-2.5 font-semibold"><Link href={sortLink("etapa")} scroll={false}>Etapă{arrow("etapa")}</Link></th>
                  <th className="px-3 py-2.5 font-semibold">Telefon</th>
                  <th aria-sort={ariaSort("camere")} className="px-3 py-2.5 font-semibold"><Link href={sortLink("camere")} scroll={false}>Camere{arrow("camere")}</Link></th>
                  <th aria-sort={ariaSort("ultima")} className="px-3 py-2.5 font-semibold"><Link href={sortLink("ultima")} scroll={false}>Ultima interacțiune{arrow("ultima")}</Link></th>
                  <th className="px-3 py-2.5 font-semibold">Responsabil</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <LeadRow key={l.id} href={`/leaduri/${l.id}`} className="border-t border-navy-600 hover:bg-navy-700/60">
                    <td className="px-3 py-2"><PriorityBadge p={l.priority} /></td>
                    <td className="max-w-[320px] px-3 py-2">
                      <Link href={`/leaduri/${l.id}`} className="font-semibold hover:text-gold-hi">{l.name}</Link>
                      {l.doNotContact && <span className="ml-2"><OptOutBadge /></span>}
                      <div className="truncate text-xs text-ink-muted">{subtitle(l)}</div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2"><CategoryCell c={l.category} /></td>
                    <td className="px-3 py-2">{ZONE_LABEL[l.zone]}</td>
                    <td className="px-3 py-2"><WebsiteBadge w={l.websiteStatus} /></td>
                    <td className="px-3 py-2"><StageBadge s={l.stage} /></td>
                    <td className="whitespace-nowrap px-3 py-2 tabular">{l.phone || <span className="text-ink-muted">—</span>}</td>
                    <td className="px-3 py-2 tabular">{l.roomsCount ?? <span className="text-ink-muted">—</span>}</td>
                    <td className="px-3 py-2">{l.lastInteractionAt ? relativeDays(l.lastInteractionAt) : <span className="text-ink-muted">niciodată</span>}</td>
                    <td className="px-3 py-2 text-ink-muted">{l.owner ? (l.owner.id === user.id ? "eu" : l.owner.name || l.owner.email) : "—"}</td>
                  </LeadRow>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.map((l) => (
              <li key={l.id}>
                <Link href={`/leaduri/${l.id}`} className="flex flex-col gap-1.5 rounded-xl border border-navy-600 bg-navy-800 p-3">
                  <span className="flex items-center gap-2">
                    <PriorityBadge p={l.priority} />
                    <b className="min-w-0 flex-1 truncate">{l.name}</b>
                    <StageBadge s={l.stage} />
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
                    {[CATEGORY_SINGULAR[l.category], ZONE_LABEL[l.zone], kind(l)].filter(Boolean).join(" · ")} <WebsiteBadge w={l.websiteStatus} />
                    {l.phone && <span className="tabular text-ink">{l.phone}</span>}
                    {l.doNotContact && <OptOutBadge />}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {pages > 1 && (
        <nav aria-label="Pagini" className="mt-4 flex items-center justify-center gap-2 text-sm">
          {f.pagina > 1 ? <Link href={qs({ pagina: String(f.pagina - 1) })} className={buttonClass("secondary", "sm")}>← Înapoi</Link> : null}
          <span className="tabular text-ink-muted">{f.pagina} / {pages}</span>
          {f.pagina < pages ? <Link href={qs({ pagina: String(f.pagina + 1) })} className={buttonClass("secondary", "sm")}>Înainte →</Link> : null}
        </nav>
      )}
    </>
  );
}

function CategoryCell({ c }: { c: keyof typeof CATEGORY_LABEL }) {
  const Icon = CATEGORY_ICON[c];
  return (
    <span className="inline-flex items-center gap-1.5 text-ink">
      <Icon size={14} className="text-gold" aria-hidden />
      {CATEGORY_SINGULAR[c]}
    </span>
  );
}
