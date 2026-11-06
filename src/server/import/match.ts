import type { LeadCategory, Zone } from "@prisma/client";
import type { LeadImportData } from "./fields";

/** Ce știm despre un lead existent (sau creat mai devreme în același import) ca să-l putem potrivi. */
export type IndexEntry = {
  id: string;
  osmId: string | null;
  category: LeadCategory;
  nameNormalized: string;
  zone: Zone;
  phoneNormalized: string | null;
};

export type MatchKind = "ID OpenStreetMap" | "nume+zonă+telefon" | "nume+zonă" | "telefon";

/**
 * Indexul de deduplicare. Ordinea de potrivire:
 *  1. același ID OpenStreetMap;
 *  2. același nume normalizat + zonă + telefon;
 *  3. același nume + zonă, când una dintre părți nu are telefon;
 *  4. același telefon în aceeași zonă.
 * Două unități cu ID-uri OSM diferite nu se unesc niciodată (ex. două „Vila Maria” diferite).
 * Potrivirile 2–4 se fac doar în aceeași categorie: restaurantul unui hotel, cu același nume
 * și telefon, rămâne lead separat la Restaurante.
 */
export class DedupeIndex {
  private byOsm = new Map<string, IndexEntry>();
  private byNameZone = new Map<string, IndexEntry[]>();
  private byPhoneZone = new Map<string, IndexEntry[]>();

  constructor(entries: IndexEntry[] = []) {
    entries.forEach((e) => this.add(e));
  }

  add(e: IndexEntry): void {
    if (e.osmId) this.byOsm.set(e.osmId, e);
    push(this.byNameZone, `${e.category}|${e.nameNormalized}|${e.zone}`, e);
    if (e.phoneNormalized) push(this.byPhoneZone, `${e.category}|${e.phoneNormalized}|${e.zone}`, e);
  }

  /** Actualizează cheile după ce un lead a primit telefon / ID OSM. */
  update(e: IndexEntry): void {
    if (e.osmId) this.byOsm.set(e.osmId, e);
    if (e.phoneNormalized) {
      const key = `${e.category}|${e.phoneNormalized}|${e.zone}`;
      const list = this.byPhoneZone.get(key) ?? [];
      if (!list.includes(e)) push(this.byPhoneZone, key, e);
    }
  }

  find(d: Pick<LeadImportData, "osmId" | "category" | "nameNormalized" | "zone" | "phoneNormalized">): { entry: IndexEntry; by: MatchKind } | null {
    if (d.osmId) {
      const hit = this.byOsm.get(d.osmId);
      if (hit) return { entry: hit, by: "ID OpenStreetMap" };
    }
    const compatible = (e: IndexEntry) => !(d.osmId && e.osmId && d.osmId !== e.osmId);
    const sameName = (this.byNameZone.get(`${d.category}|${d.nameNormalized}|${d.zone}`) ?? []).filter(compatible);
    if (d.phoneNormalized) {
      const exact = sameName.find((e) => e.phoneNormalized === d.phoneNormalized);
      if (exact) return { entry: exact, by: "nume+zonă+telefon" };
    }
    const loose = sameName.find((e) => !e.phoneNormalized || !d.phoneNormalized);
    if (loose) return { entry: loose, by: "nume+zonă" };
    if (d.phoneNormalized) {
      const byPhone = (this.byPhoneZone.get(`${d.category}|${d.phoneNormalized}|${d.zone}`) ?? []).filter(compatible);
      if (byPhone[0]) return { entry: byPhone[0], by: "telefon" };
    }
    return null;
  }
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
