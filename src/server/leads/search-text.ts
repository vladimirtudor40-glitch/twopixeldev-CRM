import type { Prisma, PrismaClient } from "@prisma/client";
import { buildSearchText, dedupeKey, normalizeName, normalizePhone } from "@/lib/normalize";
import { ZONE_LABEL } from "@/lib/labels";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Recalculează câmpurile derivate (nume normalizat, telefon normalizat, cheia de deduplicare,
 * textul de căutare) pentru lead-urile date. Se apelează după orice scriere.
 */
export async function refreshDerivedFields(db: Db, ids: string[]) {
  const CHUNK = 200;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const leads = await db.lead.findMany({
      where: { id: { in: ids.slice(i, i + CHUNK) } },
      select: {
        id: true, name: true, zone: true, businessType: true, address: true, phone: true, email: true, operatorName: true,
        operatorCui: true, websiteUrl: true, contacts: { select: { name: true, phone: true, email: true } },
        tags: { select: { tag: { select: { name: true } } } },
      },
    });
    const updates = leads.map((l) => {
      const nameNormalized = normalizeName(l.name);
      const phoneNormalized = normalizePhone(l.phone);
      return db.lead.update({
        where: { id: l.id },
        data: {
          nameNormalized,
          phoneNormalized,
          dedupeKey: dedupeKey(nameNormalized, l.zone, phoneNormalized),
          searchText: buildSearchText([
            l.name, l.businessType, l.address, ZONE_LABEL[l.zone], l.phone, l.email, l.operatorName, l.operatorCui, l.websiteUrl,
            ...l.contacts.flatMap((c) => [c.name, c.phone, c.email]),
            ...l.tags.map((t) => t.tag.name),
          ]),
        },
      });
    });
    // un batch de update-uri independente; în tranzacție doar când primim clientul normal
    if ("$transaction" in db) await (db as PrismaClient).$transaction(updates);
    else await Promise.all(updates);
  }
}
