import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LeadForm } from "@/components/leads/lead-form";
import { PageHeader } from "@/components/ui/page-header";
import { canEditLead } from "@/server/permissions";
import { getLeadDetail, listActiveUsers } from "@/server/queries/leads";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Editează lead" };

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const [lead, users] = await Promise.all([getLeadDetail(id), listActiveUsers()]);
  if (!lead) notFound();
  if (!canEditLead(user, lead)) {
    return (
      <>
        <PageHeader title={lead.name} eyebrow="Editează" />
        <p className="text-sm text-ink-muted">Poți edita doar lead-urile tale sau pe cele fără responsabil. Cere unui administrator să ți-l atribuie.</p>
      </>
    );
  }
  return (
    <>
      <PageHeader title={lead.name} eyebrow="Editează lead" />
      <LeadForm
        leadId={lead.id}
        users={users}
        canChangeOwner={user.role === "ADMIN" || !lead.ownerId}
        defaults={{
          name: lead.name, type: lead.type, zone: lead.zone, address: s(lead.address),
          latitude: s(lead.latitude), longitude: s(lead.longitude), phone: s(lead.phone), email: s(lead.email),
          starsOsm: s(lead.starsOsm), categoryMinistry: s(lead.categoryMinistry), roomsCount: s(lead.roomsCount),
          placesCount: s(lead.placesCount), websiteStatus: lead.websiteStatus, websiteUrl: s(lead.websiteUrl),
          bookingUrl: s(lead.bookingUrl), facebookUrl: s(lead.facebookUrl), instagramUrl: s(lead.instagramUrl),
          googleMapsUrl: s(lead.googleMapsUrl), ratingGoogle: s(lead.ratingGoogle), ratingBooking: s(lead.ratingBooking),
          operatorName: s(lead.operatorName), operatorCui: s(lead.operatorCui), source: lead.source, priority: lead.priority,
          ownerId: lead.ownerId ?? "", tags: lead.tags.map((t) => t.tag.name).join(", "), notes: s(lead.notes),
        }}
      />
    </>
  );
}
