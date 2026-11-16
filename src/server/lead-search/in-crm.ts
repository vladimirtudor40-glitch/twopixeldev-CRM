import "server-only";
import type { LeadCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { placeKeys, type GmapsPlace } from "./gmaps";

export type InCrm = { id: string; name: string; category: LeadCategory };

/**
 * Care dintre firmele găsite sunt deja în CRM (în orice categorie): același telefon,
 * sau același nume normalizat în aceeași zonă. Doar ca indiciu în listă; importul face deduplicarea completă.
 */
export async function findInCrm(places: GmapsPlace[]): Promise<Record<number, InCrm>> {
  if (!places.length) return {};
  const keys = places.map((p) => ({ p, ...placeKeys(p) }));
  const phones = [...new Set(keys.map((k) => k.phone).filter((x): x is string => !!x))];
  const names = [...new Set(keys.map((k) => k.nameZone.split("|")[0]!).filter(Boolean))];
  const leads = await prisma.lead.findMany({
    where: { OR: [{ phoneNormalized: { in: phones } }, { nameNormalized: { in: names } }] },
    select: { id: true, name: true, category: true, phoneNormalized: true, nameNormalized: true, zone: true },
  });
  const byPhone = new Map<string, InCrm>();
  const byName = new Map<string, InCrm>();
  for (const l of leads) {
    const v = { id: l.id, name: l.name, category: l.category };
    if (l.phoneNormalized && !byPhone.has(l.phoneNormalized)) byPhone.set(l.phoneNormalized, v);
    const k = `${l.nameNormalized}|${l.zone}`;
    if (!byName.has(k)) byName.set(k, v);
  }
  const out: Record<number, InCrm> = {};
  for (const k of keys) {
    const hit = (k.phone && byPhone.get(k.phone)) || byName.get(k.nameZone);
    if (hit) out[k.p.index] = hit;
  }
  return out;
}
