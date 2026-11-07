import Link from "next/link";
import type { PipelineStage, Priority, Zone } from "@prisma/client";
import { Phone } from "lucide-react";
import { PriorityBadge, WebsiteBadge } from "@/components/ui/badges";
import { PageHeader, Panel } from "@/components/ui/page-header";
import { PRIORITIES, STAGES, STAGE_COLOR, STAGE_LABEL, ZONES, ZONE_LABEL } from "@/lib/labels";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatNumber } from "@/lib/utils";
import { requireUser, sessionUserId } from "@/server/session";

// culorile vin din tema (globals.css), ca să urmeze și paleta site-ului în versiunea web
const PRIO_COLOR = { A: "rgb(var(--c-gold))", B: "rgb(var(--c-prio-b))", C: "rgb(var(--c-prio-c))" } as const;

type CountRow = {
  zone: Zone; priority: Priority; stage: PipelineStage;
  n: number; with_phone: number; opt_out: number; mine: number; to_call: number;
};

export default async function DashboardPage() {
  const userId = await sessionUserId();
  const active = { archivedAt: null };
  const toCallWhere = { ...active, priority: "A", stage: "NOU", doNotContact: false, phoneNormalized: { not: null } } as const;
  // Toate cifrele panoului dintr-o singură interogare (grupată pe zonă, prioritate, etapă),
  // cu enum-urile convertite în text (altfel Prisma întreabă baza separat de tipul fiecărui enum),
  // pornită odată cu restul: cu baza de date la distanță, fiecare interogare în plus costă un drum dus-întors.
  const [user, counts, toCall, lastImport] = await Promise.all([
    requireUser(),
    prisma.$queryRaw<CountRow[]>`
      SELECT "zone"::text AS zone, "priority"::text AS priority, "stage"::text AS stage,
        COUNT(*)::int AS n,
        COUNT(*) FILTER (WHERE "phoneNormalized" IS NOT NULL)::int AS with_phone,
        COUNT(*) FILTER (WHERE "doNotContact")::int AS opt_out,
        COUNT(*) FILTER (WHERE "ownerId" = ${userId})::int AS mine,
        COUNT(*) FILTER (WHERE "priority" = 'A' AND "stage" = 'NOU' AND NOT "doNotContact" AND "phoneNormalized" IS NOT NULL)::int AS to_call
      FROM "Lead"
      WHERE "archivedAt" IS NULL
      GROUP BY "zone", "priority", "stage"`,
    prisma.lead.findMany({
      where: toCallWhere,
      orderBy: [{ zone: "asc" }, { nameNormalized: "asc" }],
      take: 10,
      select: { id: true, name: true, zone: true, phone: true, websiteStatus: true },
    }),
    prisma.importBatch.findFirst({ where: { status: "FINALIZAT" }, orderBy: { finishedAt: "desc" } }),
  ]);
  const sum = (rows: CountRow[], key: "n" | "with_phone" | "opt_out" | "mine" | "to_call") => rows.reduce((a, r) => a + r[key], 0);
  const total = sum(counts, "n");
  const withPhone = sum(counts, "with_phone");
  const optOut = sum(counts, "opt_out");
  const mine = sum(counts, "mine");
  const toCallTotal = sum(counts, "to_call");

  const cell = (z: string, p: string) => sum(counts.filter((r) => r.zone === z && r.priority === p), "n");
  const zoneRows = ZONES.map((z) => ({ z, counts: PRIORITIES.map((p) => cell(z, p)) }))
    .map((r) => ({ ...r, total: r.counts.reduce((a, b) => a + b, 0) }))
    .filter((r) => r.total > 0);
  const zmax = Math.max(1, ...zoneRows.map((r) => r.total));
  const stageCount = (s: string) => sum(counts.filter((r) => r.stage === s), "n");

  const today = new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <>
      <PageHeader title={`Bună, ${user.name?.split(" ")[0] ?? ""}`.trim()} eyebrow={today} />

      {total === 0 ? (
        <Panel>
          <h2 className="font-display text-base font-bold">Baza de date e goală</h2>
          <p className="mt-1 text-sm text-ink-muted">
            {user.role === "ADMIN"
              ? <>Începe cu <Link href="/import" className="text-teal-hi underline">importul fișierului leaduri_litoral.xlsx</Link> sau <Link href="/leaduri/nou" className="text-teal-hi underline">adaugă un lead de mână</Link>.</>
              : <><Link href="/leaduri/nou" className="text-teal-hi underline">Adaugă primul lead</Link> sau cere unui administrator să importe lista.</>}
          </p>
        </Panel>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { label: "Unități în bază", value: total, sub: `${formatNumber(withPhone)} cu telefon`, href: "/leaduri" },
              { label: "Prioritate A de sunat", value: toCallTotal, sub: "cu telefon, încă necontactate", href: "/leaduri" },
              { label: "De verificat pe Google Maps", value: stageCount("NOU") + stageCount("DE_VERIFICAT") - toCallTotal, sub: "fără telefon sau prioritate B/C", href: "/leaduri?etapa=NOU,DE_VERIFICAT&telefon=nu" },
              { label: "Ale mele", value: mine, sub: optOut ? `${optOut} cu „Nu mai contacta”` : "lead-uri cu tine responsabil", href: "/leaduri?responsabil=eu" },
            ].map((k) => (
              <Link key={k.label} href={k.href} className="rounded-xl border border-navy-600 bg-navy-800 px-4 py-3 hover:border-teal">
                <div className="text-[15px] font-semibold uppercase tracking-[0.06em] text-ink-muted">{k.label}</div>
                <div className="mt-1 font-display text-3xl font-extrabold tabular">{formatNumber(Math.max(0, k.value))}</div>
                <div className="text-xs text-ink-muted">{k.sub}</div>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="font-display text-base font-bold">De sunat primii</h2>
                <Link href="/leaduri" className="ml-auto text-xs text-teal-hi hover:underline">Toate {toCallTotal} →</Link>
              </div>
              <p className="mb-2 text-xs text-ink-muted">Prioritate A, cu telefon, încă în etapa „Nou”.</p>
              {toCall.length === 0 ? <p className="text-sm text-ink-muted">Nu mai sunt lead-uri A nesunate. Treci la cele B de verificat.</p> : (
                <ul className="flex flex-col">
                  {toCall.map((l) => (
                    <li key={l.id} className="flex flex-wrap items-center gap-2 border-t border-navy-600 py-2 first:border-0">
                      <PriorityBadge p="A" />
                      <Link href={`/leaduri/${l.id}`} className="min-w-0 flex-1 truncate font-semibold hover:text-gold-hi">{l.name}</Link>
                      <span className="text-xs text-ink-muted">{ZONE_LABEL[l.zone]}</span>
                      <WebsiteBadge w={l.websiteStatus} />
                      {l.phone && <a href={`tel:${l.phone.replace(/\s/g, "")}`} className="flex items-center gap-1 text-xs tabular text-teal-hi"><Phone size={12} />{l.phone}</a>}
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel>
              <h2 className="font-display text-base font-bold">Lead-uri pe zonă și prioritate</h2>
              <div className="mb-3 mt-1.5 flex flex-wrap gap-3 text-xs text-ink-muted">
                {PRIORITIES.map((p) => <span key={p} className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full" style={{ background: PRIO_COLOR[p] }} />{p === "A" ? "A, de sunat" : p === "B" ? "B, de verificat" : "C, au site"}</span>)}
              </div>
              <div className="flex flex-col gap-2">
                {zoneRows.map((r) => (
                  <Link key={r.z} href={`/leaduri?zona=${r.z}`} className="grid grid-cols-[120px_minmax(0,1fr)_44px] items-center gap-2 text-sm hover:text-gold-hi sm:grid-cols-[170px_minmax(0,1fr)_48px]">
                    <span className="truncate">{ZONE_LABEL[r.z]}</span>
                    <span className="flex h-4 overflow-hidden rounded" style={{ width: `${(r.total / zmax) * 100}%` }} title={r.counts.map((c, i) => `${PRIORITIES[i]}: ${c}`).join(" · ")}>
                      {r.counts.map((c, i) => <i key={i} style={{ flex: c, background: PRIO_COLOR[PRIORITIES[i]!] }} />)}
                    </span>
                    <span className="text-right tabular text-ink-muted">{r.total}</span>
                  </Link>
                ))}
              </div>
            </Panel>

            <Panel>
              <h2 className="mb-3 font-display text-base font-bold">Pe etape</h2>
              <div className="flex flex-col gap-1.5">
                {STAGES.map((s) => {
                  const n = stageCount(s);
                  return (
                    <Link key={s} href={`/leaduri?etapa=${s}`} className="grid grid-cols-[130px_minmax(0,1fr)_48px] items-center gap-2 text-sm hover:text-gold-hi">
                      <span className="flex items-center gap-1.5 truncate"><i className="h-2 w-2 shrink-0 rounded-full" style={{ background: STAGE_COLOR[s] }} />{STAGE_LABEL[s]}</span>
                      <span className="h-3 overflow-hidden rounded bg-navy-700"><i className="block h-full rounded" style={{ width: `${(n / Math.max(1, total)) * 100}%`, background: STAGE_COLOR[s] }} /></span>
                      <span className="text-right tabular text-ink-muted">{n}</span>
                    </Link>
                  );
                })}
              </div>
            </Panel>

            <Panel>
              <h2 className="mb-2 font-display text-base font-bold">Ultimul import</h2>
              {lastImport ? (
                <p className="text-sm">
                  <Link href={`/import/${lastImport.id}`} className="text-teal-hi hover:underline">{lastImport.fileName}</Link>, {formatDateTime(lastImport.finishedAt)}:{" "}
                  <b>{lastImport.createdRows}</b> noi, <b>{lastImport.updatedRows}</b> completate, {lastImport.unchangedRows} neschimbate.
                </p>
              ) : <p className="text-sm text-ink-muted">Niciun import încă.</p>}
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
