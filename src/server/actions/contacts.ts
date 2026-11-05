"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { formatPhone, normalizePhone } from "@/lib/normalize";
import { contactFormSchema, type ContactFormInput } from "@/lib/validators/contact";
import { auditData, diff } from "@/server/audit";
import { refreshDerivedFields } from "@/server/leads/search-text";
import { canEditLead } from "@/server/permissions";
import { requireUser } from "@/server/session";
import type { ActionResult } from "./types";

async function guard(leadId: string) {
  const user = await requireUser();
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { ownerId: true } });
  if (!lead) return { user, error: "Lead-ul nu mai există." };
  if (!canEditLead(user, lead)) return { user, error: "Poți edita doar lead-urile tale sau pe cele fără responsabil." };
  return { user, error: null };
}

function toData(d: ReturnType<typeof contactFormSchema.parse>) {
  const phoneNormalized = normalizePhone(d.phone);
  return {
    name: d.name,
    role: d.role as Prisma.ContactCreateInput["role"],
    phone: phoneNormalized ? formatPhone(phoneNormalized) : d.phone,
    phoneNormalized,
    whatsapp: d.whatsapp,
    email: d.email,
    preferredChannel: d.preferredChannel as Prisma.ContactCreateInput["preferredChannel"],
    isPrimary: d.isPrimary,
    notes: d.notes,
  };
}

export async function saveContact(leadId: string, contactId: string | null, input: ContactFormInput): Promise<ActionResult> {
  const { user, error } = await guard(leadId);
  if (error) return { ok: false, error };
  const parsed = contactFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Verifică câmpurile marcate.", fieldErrors: parsed.error.flatten().fieldErrors };
  const data = toData(parsed.data);

  await prisma.$transaction(async (tx) => {
    if (data.isPrimary) await tx.contact.updateMany({ where: { leadId }, data: { isPrimary: false } });
    if (contactId) {
      const before = await tx.contact.findFirstOrThrow({ where: { id: contactId, leadId } });
      await tx.contact.update({ where: { id: contactId }, data });
      const changes = diff(before as unknown as Record<string, unknown>, data, ["name", "role", "phone", "whatsapp", "email", "preferredChannel", "isPrimary", "notes"]);
      if (Object.keys(changes).length) {
        await tx.auditLog.create({ data: auditData({ userId: user.id, action: "ACTUALIZARE", entityType: "Contact", entityId: leadId, changes, meta: { contactId, name: data.name } }) });
      }
    } else {
      const count = await tx.contact.count({ where: { leadId } });
      const created = await tx.contact.create({ data: { ...data, isPrimary: data.isPrimary || count === 0, leadId } });
      await tx.auditLog.create({ data: auditData({ userId: user.id, action: "CREARE", entityType: "Contact", entityId: leadId, meta: { contactId: created.id, name: data.name } }) });
    }
  });
  await refreshDerivedFields(prisma, [leadId]);
  revalidatePath(`/leaduri/${leadId}`);
  return { ok: true, message: contactId ? "Persoana a fost actualizată." : "Persoana a fost adăugată." };
}

export async function deleteContact(leadId: string, contactId: string): Promise<ActionResult> {
  const { user, error } = await guard(leadId);
  if (error) return { ok: false, error };
  const contact = await prisma.contact.findFirst({ where: { id: contactId, leadId } });
  if (!contact) return { ok: false, error: "Persoana nu mai există." };
  await prisma.$transaction([
    prisma.contact.delete({ where: { id: contactId } }),
    prisma.auditLog.create({ data: auditData({ userId: user.id, action: "STERGERE", entityType: "Contact", entityId: leadId, meta: { contactId, name: contact.name } }) }),
  ]);
  await refreshDerivedFields(prisma, [leadId]);
  revalidatePath(`/leaduri/${leadId}`);
  return { ok: true, message: "Persoana a fost ștearsă." };
}
