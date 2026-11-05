import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Mail, MapPin, MessageCircle, Pencil, Phone } from "lucide-react";
import { ArchiveButton, ClaimButton, OptOutControl } from "@/components/leads/lead-actions";
import { ContactsSection } from "@/components/leads/contacts-section";
import { PriorityBadge, StageBadge, WebsiteBadge } from "@/components/ui/badges";
import { buttonClass } from "@/components/ui/button";
import { Panel } from "@/components/ui/page-header";
import { AUDIT_LABEL, IMPORT_ACTION_LABEL, LEAD_FIELD_LABEL, SOURCE_LABEL, TYPE_LABEL, ZONE_LABEL } from "@/lib/labels";
import { mailLink, mapsLink, telLink, whatsappLink } from "@/lib/links";
import { formatDate, formatDateTime } from "@/lib/utils";
import { canArchive, canEditLead } from "@/server/permissions";
import { getLeadAudit, getLeadDetail } from "@/server/queries/leads";
import { requireUser } from "@/server/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const lead = await getLeadDetail((await params).id);
  return { title: lead?.name ?? "Lead" };
}

function Ext({ href, children }: { href: string | null; children?: React.ReactNode }) {
  if (!href) return <span className="text-ink-muted">—</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-1 break-all text-teal-hi hover:underline">
      {children ?? href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}<ExternalLink size={12} className="shrink-0" aria-hidden />
    </a>
  );
}

const fmtValue = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : Array.isArray(v) ? v.join(", ") : String(v));

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [lead, audit] = await Promise.all([getLeadDetail(id), getLeadAudit(id)]);
  if (!lead) notFound();
  const canEdit = canEditLead(user, lead);
  const primary = lead.contacts.find((c) => c.isPrimary) ?? lead.contacts[0];
  const phone = primary?.phone || lead.phone;
  const email = primary?.email || lead.email;
  const blocked = lead.doNotContact;
  const lat = lead.latitude?.toNumber() ?? null;
  const lon = lead.longitude?.toNumber() ?? null;
  const maps = mapsLink({ name: lead.name, address: lead.address, zoneLabel: ZONE_LABEL[lead.zone], googleMapsUrl: lead.googleMapsUrl });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <Link href="/leaduri" className="hover:text-ink">Lead-uri</Link><span aria-hidden>/</span><span>{ZONE_LABEL[lead.zone]}</span>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <PriorityBadge p={lead.priority} />
              <span>{TYPE_LABEL[lead.type]}{lead.categoryMinistry ? ` · ${lead.categoryMinistry}` : ""}{lead.starsOsm ? ` · ${lead.starsOsm}★ OSM` : ""}{lead.roomsCount ? ` · ${lead.roomsCount} camere` : ""}</span>
            </div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-balance">{lead.name}</h1>
            <p className="text-sm text-ink-muted">{[lead.address, ZONE_LABEL[lead.zone]].filter(Boolean).join(", ")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && <Link href={`/leaduri/${lead.id}/editeaza`} className={buttonClass("secondary", "sm")}><Pencil size={13} />Editează</Link>}
            {!lead.ownerId && <ClaimButton leadId={lead.id} />}
            {canArchive(user) && <ArchiveButton leadId={lead.id} archived={!!lead.archivedAt} />}
          </div>
        </div>

        {lead.archivedAt && <div className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm text-warn">Lead arhivat pe {formatDate(lead.archivedAt)}. Nu apare în liste.</div>}

        {blocked ? (
          <div className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2.5 text-sm text-[#F2A49D]">
            <b>Nu mai contacta.</b> Marcat de {lead.doNotContactBy?.name || lead.doNotContactBy?.email || "un utilizator"} pe {formatDate(lead.doNotContactAt)}
            {lead.doNotContactReason ? ` · ${lead.doNotContactReason}` : ""}. Butoanele de contact sunt dezactivate și lead-ul nu intră în campanii.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <a href={telLink(phone) ?? undefined} aria-disabled={!telLink(phone)} className={buttonClass("primary", "md", "h-11")}><Phone size={16} />Sună</a>
            <a href={whatsappLink(primary?.whatsapp || phone) ?? undefined} aria-disabled={!whatsappLink(primary?.whatsapp || phone)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md", "h-11")}><MessageCircle size={16} />WhatsApp</a>
            <a href={mailLink(email) ?? undefined} aria-disabled={!email} className={buttonClass("secondary", "md", "h-11")}><Mail size={16} />Email</a>
            <a href={maps} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md", "h-11")}><MapPin size={16} />Google Maps</a>
          </div>
        )}
        {!blocked && (phone || email) && (
          <p className="text-xs text-ink-muted">
            {phone && <>Telefon: <span className="select-all tabular text-ink">{phone}</span></>}
            {phone && email && " · "}
            {email && <>Email: <span className="select-all text-ink">{email}</span></>}
            {primary && ` · ${primary.name}`}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Panel>
          <h2 className="mb-3 font-display text-base font-bold">Detalii</h2>
          {lead.manualCheckNote && (
            <div className="mb-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-sm">
              <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-warn">Verificare manuală</span>
              <div>{lead.manualCheckNote}</div>
            </div>
          )}
          <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
            <dt className="text-ink-muted">Etapă</dt><dd><StageBadge s={lead.stage} /></dd>
            <dt className="text-ink-muted">Status site</dt><dd><WebsiteBadge w={lead.websiteStatus} /></dd>
            <dt className="text-ink-muted">Site propriu</dt><dd className="min-w-0"><Ext href={lead.websiteUrl} /></dd>
            <dt className="text-ink-muted">Booking</dt><dd className="min-w-0"><Ext href={lead.bookingUrl}>{lead.bookingUrl ? "Pagina pe Booking.com" : undefined}</Ext></dd>
            <dt className="text-ink-muted">Facebook</dt><dd className="min-w-0"><Ext href={lead.facebookUrl} /></dd>
            <dt className="text-ink-muted">Instagram</dt><dd className="min-w-0"><Ext href={lead.instagramUrl} /></dd>
            {lead.otherLinks.length > 0 && (<><dt className="text-ink-muted">Alte linkuri</dt><dd className="flex min-w-0 flex-col gap-1">{lead.otherLinks.map((u) => <Ext key={u} href={u} />)}</dd></>)}
            <dt className="text-ink-muted">Rating</dt>
            <dd className="tabular">{lead.ratingGoogle ? `Google ${lead.ratingGoogle.toString()} / 5` : "Google —"} · {lead.ratingBooking ? `Booking ${lead.ratingBooking.toString()} / 10` : "Booking —"}</dd>
            <dt className="text-ink-muted">Operator</dt><dd>{lead.operatorName || "—"}{lead.operatorCui ? <span className="text-ink-muted"> · CUI {lead.operatorCui}</span> : null}</dd>
            <dt className="text-ink-muted">Lista ministerului</dt><dd>{lead.inMinistryList ? "Da" : "Nu"}</dd>
            <dt className="text-ink-muted">Sursă</dt><dd>{SOURCE_LABEL[lead.source]}{lead.osmUrl ? <> · <Ext href={lead.osmUrl}>OpenStreetMap</Ext></> : null}</dd>
            <dt className="text-ink-muted">Coordonate</dt><dd className="tabular">{lat !== null && lon !== null ? `${lat.toFixed(5)}, ${lon.toFixed(5)}` : "—"}</dd>
            <dt className="text-ink-muted">Responsabil</dt><dd>{lead.owner ? lead.owner.name || lead.owner.email : "Fără responsabil"}</dd>
            <dt className="text-ink-muted">Etichete</dt>
            <dd className="flex flex-wrap gap-1">{lead.tags.length ? lead.tags.map((t) => <span key={t.tagId} className="rounded-full border border-navy-600 px-2 py-0.5 text-xs">{t.tag.name}</span>) : "—"}</dd>
            <dt className="text-ink-muted">Adăugat</dt><dd>{formatDateTime(lead.createdAt)}{lead.createdBy ? ` de ${lead.createdBy.name || lead.createdBy.email}` : ""}</dd>
          </dl>
          {lead.notes && <div className="mt-3 whitespace-pre-wrap rounded-lg bg-navy p-3 text-sm">{lead.notes}</div>}
          <div className="mt-4"><OptOutControl leadId={lead.id} active={lead.doNotContact} canEdit={canEdit} /></div>
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <Panel>
            <h2 className="mb-3 font-display text-base font-bold">Persoane de contact</h2>
            <ContactsSection leadId={lead.id} contacts={lead.contacts} canEdit={canEdit} blocked={blocked} />
          </Panel>

          <Panel>
            <h2 className="mb-3 font-display text-base font-bold">Istoric modificări</h2>
            {audit.length === 0 && lead.importRows.length === 0 ? (
              <p className="text-sm text-ink-muted">Nicio modificare încă.</p>
            ) : (
              <ol className="flex flex-col gap-2.5 text-sm">
                {audit.map((a) => {
                  const changes = (a.changes ?? {}) as Record<string, { from: unknown; to: unknown }>;
                  const meta = (a.meta ?? {}) as { name?: string };
                  return (
                    <li key={a.id} className="border-l-2 border-navy-600 pl-3">
                      <div>
                        <b>{a.user?.name || a.user?.email || "Sistem"}</b> {AUDIT_LABEL[a.action]}
                        {a.entityType === "Contact" ? ` persoana ${meta.name ?? ""}` : ""}
                      </div>
                      {Object.entries(changes).slice(0, 6).map(([k, v]) => (
                        <div key={k} className="text-xs text-ink-muted">
                          {LEAD_FIELD_LABEL[k] ?? k}: <s>{fmtValue(v.from)}</s> → <span className="text-ink">{fmtValue(v.to)}</span>
                        </div>
                      ))}
                      <div className="text-xs text-ink-muted">{formatDateTime(a.createdAt)}</div>
                    </li>
                  );
                })}
                {lead.importRows.map((r) => (
                  <li key={r.id} className="border-l-2 border-teal/50 pl-3">
                    <div>
                      Import <Link href={`/import/${r.batch.id}`} className="text-teal-hi hover:underline">{r.batch.fileName}</Link>, rândul {r.rowNumber}: {r.action ? IMPORT_ACTION_LABEL[r.action].toLowerCase() : "în previzualizare"}
                    </div>
                    {r.updatedFields.length > 0 && <div className="text-xs text-ink-muted">Completat: {r.updatedFields.map((f) => LEAD_FIELD_LABEL[f] ?? f).join(", ")}</div>}
                    <div className="text-xs text-ink-muted">{formatDateTime(r.batch.createdAt)}</div>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
