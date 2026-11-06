"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatPhone, normalizeName, normalizePhone, osmIdFromUrl } from "@/lib/normalize";
import { leadFormSchema, type LeadFormInput } from "@/lib/validators/lead";
import { auditData, diff } from "@/server/audit";
import { refreshDerivedFields } from "@/server/leads/search-text";
import { canArchive, canAssignOwner, canEditLead } from "@/server/permissions";
import { requireUser } from "@/server/session";
import type { ActionResult } from "./types";

const AUDITED = [
  "name", "category", "type", "zone", "address", "latitude", "longitude", "phone", "email", "starsOsm", "categoryMinistry",
  "roomsCount", "placesCount", "websiteStatus", "websiteUrl", "bookingUrl", "facebookUrl", "instagramUrl",
  "googleMapsUrl", "ratingGoogle", "ratingBooking", "operatorName", "operatorCui", "source", "priority", "ownerId", "notes",
];

function toLeadData(d: ReturnType<typeof leadFormSchema.parse>) {
  const phoneNormalized = normalizePhone(d.phone);
  return {
    name: d.name,
    nameNormalized: normalizeName(d.name),
    category: d.category as Prisma.LeadCreateInput["category"],
    // Tipul unității are sens doar la cazare; la celelalte categorii rămâne „Altul”.
    type: (d.category === "HOTELURI" ? d.type : "ALTUL") as Prisma.LeadCreateInput["type"],
    zone: d.zone as Prisma.LeadCreateInput["zone"],
    address: d.address,
    latitude: d.latitude,
    longitude: d.longitude,
    phone: phoneNormalized ? formatPhone(phoneNormalized) : d.phone,
    phoneNormalized,
    email: d.email,
    starsOsm: d.starsOsm,
    categoryMinistry: d.categoryMinistry,
    roomsCount: d.roomsCount,
    placesCount: d.placesCount,
    websiteStatus: d.websiteStatus as Prisma.LeadCreateInput["websiteStatus"],
    websiteUrl: d.websiteUrl,
    bookingUrl: d.bookingUrl,
    facebookUrl: d.facebookUrl,
    instagramUrl: d.instagramUrl,
    googleMapsUrl: d.googleMapsUrl,
    ratingGoogle: d.ratingGoogle,
    ratingBooking: d.ratingBooking,
    operatorName: d.operatorName,
    operatorCui: d.operatorCui ? d.operatorCui.replace(/\s/g, "").toUpperCase() : null,
    source: d.source as Prisma.LeadCreateInput["source"],
    priority: d.priority as Prisma.LeadCreateInput["priority"],
    notes: d.notes,
  };
}

async function setTags(tx: Prisma.TransactionClient, leadId: string, names: string[]) {
  await tx.leadTag.deleteMany({ where: { leadId, tag: { name: { notIn: names } } } });
  for (const name of names) {
    const tag = await tx.tag.upsert({ where: { name }, update: {}, create: { name } });
    await tx.leadTag.upsert({
      where: { leadId_tagId: { leadId, tagId: tag.id } },
      update: {},
      create: { leadId, tagId: tag.id },
    });
  }
}

/** Caută un posibil duplicat înainte de salvare (același nume + zonă sau același telefon). */
async function findDuplicate(name: string, zone: string, phone: string | null, excludeId?: string) {
  const nameNormalized = normalizeName(name);
  const phoneNormalized = normalizePhone(phone);
  return prisma.lead.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      archivedAt: null,
      OR: [
        { nameNormalized, zone: zone as Prisma.LeadWhereInput["zone"] },
        ...(phoneNormalized ? [{ phoneNormalized }] : []),
      ],
    },
    select: { id: true, name: true },
  });
}

export async function createLead(input: LeadFormInput & { ignoreDuplicate?: boolean }): Promise<ActionResult<{ id: string; duplicateOf?: { id: string; name: string } }>> {
  const user = await requireUser();
  const parsed = leadFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Verifică câmpurile marcate.", fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  if (!input.ignoreDuplicate) {
    const dup = await findDuplicate(d.name, d.zone, d.phone);
    if (dup) {
      return { ok: false, error: `Există deja „${dup.name}” cu același nume în zonă sau același telefon.`, fieldErrors: { name: [`duplicat:${dup.id}`] } };
    }
  }
  const ownerId = d.ownerId && user.role === "ADMIN" ? d.ownerId : user.id;
  const lead = await prisma.$transaction(async (tx) => {
    const created = await tx.lead.create({
      data: { ...toLeadData(d), ownerId, createdById: user.id, stage: "NOU" },
    });
    await setTags(tx, created.id, d.tags);
    await tx.auditLog.create({ data: auditData({ userId: user.id, action: "CREARE", entityType: "Lead", entityId: created.id, meta: { name: created.name } }) });
    return created;
  });
  await refreshDerivedFields(prisma, [lead.id]);
  revalidatePath("/leaduri");
  return { ok: true, data: { id: lead.id } };
}

export async function updateLead(id: string, input: LeadFormInput): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const before = await prisma.lead.findUnique({ where: { id }, include: { tags: { include: { tag: true } } } });
  if (!before) return { ok: false, error: "Lead-ul nu mai există." };
  if (!canEditLead(user, before)) return { ok: false, error: "Poți edita doar lead-urile tale sau pe cele fără responsabil." };
  const parsed = leadFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Verifică câmpurile marcate.", fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;
  const ownerId = d.ownerId ?? null;
  if (!canAssignOwner(user, before, ownerId)) return { ok: false, error: "Doar un administrator poate schimba responsabilul." };

  const data = { ...toLeadData(d), ownerId };
  // dacă s-a completat linkul OSM manual, păstrăm și ID-ul
  const changes = diff(before as unknown as Record<string, unknown>, data as Record<string, unknown>, AUDITED);
  const beforeTags = before.tags.map((t) => t.tag.name).sort();
  if (JSON.stringify(beforeTags) !== JSON.stringify([...d.tags].sort())) changes.tags = { from: beforeTags, to: d.tags };

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({ where: { id }, data });
    await setTags(tx, id, d.tags);
    if (Object.keys(changes).length) {
      await tx.auditLog.create({ data: auditData({ userId: user.id, action: "ACTUALIZARE", entityType: "Lead", entityId: id, changes }) });
    }
  });
  await refreshDerivedFields(prisma, [id]);
  revalidatePath(`/leaduri/${id}`);
  revalidatePath("/leaduri");
  return { ok: true, data: { id } };
}

export async function setDoNotContact(id: string, value: boolean, reason?: string): Promise<ActionResult> {
  const user = await requireUser();
  const lead = await prisma.lead.findUnique({ where: { id }, select: { ownerId: true, doNotContact: true } });
  if (!lead) return { ok: false, error: "Lead-ul nu mai există." };
  if (!canEditLead(user, lead)) return { ok: false, error: "Poți modifica doar lead-urile tale sau pe cele fără responsabil." };
  await prisma.$transaction([
    prisma.lead.update({
      where: { id },
      data: value
        ? { doNotContact: true, doNotContactAt: new Date(), doNotContactById: user.id, doNotContactReason: reason?.trim() || null }
        : { doNotContact: false, doNotContactAt: null, doNotContactById: null, doNotContactReason: null },
    }),
    prisma.auditLog.create({
      data: auditData({ userId: user.id, action: "OPT_OUT", entityType: "Lead", entityId: id, changes: { doNotContact: { from: lead.doNotContact, to: value } }, meta: reason ? { reason } : null }),
    }),
  ]);
  revalidatePath(`/leaduri/${id}`);
  return { ok: true, message: value ? "Marcat „Nu mai contacta”." : "Opt-out anulat." };
}

export async function claimLead(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const res = await prisma.lead.updateMany({ where: { id, ownerId: null }, data: { ownerId: user.id } });
  if (!res.count) return { ok: false, error: "Lead-ul are deja un responsabil." };
  await prisma.auditLog.create({
    data: auditData({ userId: user.id, action: "ACTUALIZARE", entityType: "Lead", entityId: id, changes: { ownerId: { from: null, to: user.id } } }),
  });
  revalidatePath(`/leaduri/${id}`);
  return { ok: true, message: "Lead-ul e acum al tău." };
}

export async function archiveLead(id: string, archived: boolean): Promise<ActionResult> {
  const user = await requireUser();
  if (!canArchive(user)) return { ok: false, error: "Doar un administrator poate arhiva lead-uri." };
  await prisma.$transaction([
    prisma.lead.update({ where: { id }, data: { archivedAt: archived ? new Date() : null } }),
    prisma.auditLog.create({ data: auditData({ userId: user.id, action: archived ? "STERGERE" : "RESTAURARE", entityType: "Lead", entityId: id }) }),
  ]);
  revalidatePath("/leaduri");
  revalidatePath(`/leaduri/${id}`);
  if (archived) redirect("/leaduri");
  return { ok: true, message: "Lead restaurat." };
}

/** Linkul OSM introdus manual primește și ID-ul OSM (folosit la deduplicare). */
export async function setOsmLink(id: string, url: string): Promise<ActionResult> {
  const user = await requireUser();
  const lead = await prisma.lead.findUnique({ where: { id }, select: { ownerId: true } });
  if (!lead || !canEditLead(user, lead)) return { ok: false, error: "Nu poți modifica acest lead." };
  const osmId = osmIdFromUrl(url);
  if (!osmId) return { ok: false, error: "Linkul nu e o pagină OpenStreetMap (node/way/relation)." };
  const taken = await prisma.lead.findFirst({ where: { osmId, id: { not: id } }, select: { name: true } });
  if (taken) return { ok: false, error: `Linkul OSM aparține deja lead-ului „${taken.name}”.` };
  await prisma.lead.update({ where: { id }, data: { osmUrl: url, osmId } });
  revalidatePath(`/leaduri/${id}`);
  return { ok: true };
}
