import type { LeadSource, Priority, PropertyType, WebsiteStatus, Zone } from "@prisma/client";
import {
  normalizeName, normalizePhone, normalizeText, normalizeUrl, osmIdFromUrl, parseIntLoose, parseNumber,
} from "@/lib/normalize";

/** Datele unui lead așa cum ies dintr-un rând de import, gata de scris în baza de date. */
export type LeadImportData = {
  name: string;
  nameNormalized: string;
  zone: Zone;
  type?: PropertyType;
  address?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  phoneNormalized?: string;
  email?: string;
  starsOsm?: number;
  categoryMinistry?: string;
  roomsCount?: number;
  placesCount?: number;
  websiteStatus?: WebsiteStatus;
  websiteUrl?: string;
  bookingUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  otherLinks?: string[];
  googleMapsUrl?: string;
  osmUrl?: string;
  osmId?: string;
  operatorName?: string;
  operatorCui?: string;
  inMinistryList?: boolean;
  source?: LeadSource;
  priority?: Priority;
  manualCheckNote?: string;
};

type Draft = Partial<LeadImportData> & { _name?: string; _zoneText?: string };

export type TargetField = {
  key: string;
  label: string;
  /** antetele recunoscute automat (comparate după normalizeText) */
  aliases: string[];
  apply: (value: string, out: Draft) => void;
};

const str = (v: string) => v.trim();

export function parsePriority(v: string): Priority | undefined {
  const c = v.trim().toUpperCase().charAt(0);
  return c === "A" || c === "B" || c === "C" ? c : undefined;
}

export function parseType(v: string): PropertyType | undefined {
  const t = normalizeText(v);
  if (!t) return undefined;
  if (t.includes("apartament") || t.includes("regim hotelier") || t.includes("apartment")) return "APARTAMENT_REGIM_HOTELIER";
  if (t.includes("hostel")) return "HOSTEL";
  if (t.includes("motel")) return "MOTEL";
  if (t.includes("camping") || t.includes("popas") || t.includes("campsite")) return "CAMPING";
  if (t.includes("casa de vacanta") || t.includes("casa vacanta") || t.includes("chalet")) return "CASA_DE_VACANTA";
  if (t.includes("pensiune") || t.includes("vila") || t.includes("villa") || t.includes("guest")) return "PENSIUNE_VILA";
  if (t.includes("hotel")) return "HOTEL";
  return "ALTUL";
}

export function parseZone(v: string): Zone {
  const t = normalizeText(v);
  if (t.includes("mamaia nord") || t.includes("navodari")) return "MAMAIA_NORD_NAVODARI";
  if (t.includes("mamaia")) return "MAMAIA";
  if (t.includes("eforie nord")) return "EFORIE_NORD";
  if (t.includes("eforie sud")) return "EFORIE_SUD";
  if (t.includes("agigea")) return "AGIGEA";
  if (t.includes("constanta")) return "CONSTANTA";
  return "ALTA";
}

export function parseWebsiteStatus(v: string): WebsiteStatus | undefined {
  const t = normalizeText(v);
  if (!t) return undefined;
  if (t.includes("are site")) return "ARE_SITE_PROPRIU";
  if (t.startsWith("doar") || t.includes("booking") || t.includes("facebook") || t.includes("platform")) return "DOAR_PLATFORME";
  if (t.includes("fara site")) return "FARA_SITE";
  return "NECUNOSCUT";
}

export function parseSource(v: string): LeadSource | undefined {
  const t = normalizeText(v);
  if (!t) return undefined;
  const osm = t.includes("openstreetmap") || /\bosm\b/.test(t);
  const min = t.includes("minister");
  if (osm && min) return "OSM_SI_MINISTER";
  if (osm) return "OSM";
  if (min) return "MINISTER";
  if (t.includes("places")) return "GOOGLE_PLACES";
  if (t.includes("google")) return "GOOGLE_MAPS";
  if (t.includes("booking")) return "BOOKING";
  if (t.includes("facebook") || t.includes("instagram")) return "FACEBOOK_INSTAGRAM";
  if (t.includes("travelminit") || t.includes("turistinfo") || t.includes("infoturism")) return "PLATFORMA_LOCALA";
  return "MANUAL";
}

export function parseYesNo(v: string): boolean | undefined {
  const t = normalizeText(v);
  if (!t) return undefined;
  if (["da", "yes", "true", "1", "x"].includes(t)) return true;
  if (["nu", "no", "false", "0"].includes(t)) return false;
  return undefined;
}

/** Împarte „booking | facebook | alt link” pe platforme. */
export function classifyLinks(v: string, out: Draft): void {
  const parts = v.split(/\s*[|;,\n]\s*|\s+/).map((x) => normalizeUrl(x)).filter((x): x is string => !!x);
  const other: string[] = [...(out.otherLinks ?? [])];
  for (const url of parts) {
    const host = url.toLowerCase();
    if (host.includes("booking.com") && !out.bookingUrl) out.bookingUrl = url;
    else if ((host.includes("facebook.com") || host.includes("fb.com")) && !out.facebookUrl) out.facebookUrl = url;
    else if (host.includes("instagram.com") && !out.instagramUrl) out.instagramUrl = url;
    else if (!other.includes(url)) other.push(url);
  }
  if (other.length) out.otherLinks = other;
}

export const TARGET_FIELDS: TargetField[] = [
  { key: "priority", label: "Prioritate (A/B/C)", aliases: ["prioritate", "priority"], apply: (v, o) => { o.priority = parsePriority(v); } },
  { key: "name", label: "Nume", aliases: ["nume", "denumire", "name", "unitate", "denumire unitate"], apply: (v, o) => { o._name = str(v); } },
  { key: "type", label: "Tip", aliases: ["tip", "type", "tip unitate", "tip structura"], apply: (v, o) => { o.type = parseType(v); } },
  { key: "zone", label: "Zonă", aliases: ["zona", "zone", "localitate", "statiune"], apply: (v, o) => { o._zoneText = v; } },
  { key: "address", label: "Adresă", aliases: ["adresa", "address"], apply: (v, o) => { o.address = str(v) || undefined; } },
  {
    key: "phone", label: "Telefon", aliases: ["telefon", "phone", "tel"],
    apply: (v, o) => { const p = normalizePhone(v); if (p) { o.phone = str(v); o.phoneNormalized = p; } },
  },
  {
    key: "email", label: "Email", aliases: ["email", "e mail", "mail"],
    apply: (v, o) => { const e = v.trim().toLowerCase().split(/[;,\s]/)[0] ?? ""; if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e)) o.email = e; },
  },
  { key: "websiteStatus", label: "Status site", aliases: ["status site", "site status"], apply: (v, o) => { o.websiteStatus = parseWebsiteStatus(v); } },
  { key: "websiteUrl", label: "Site propriu (link)", aliases: ["site propriu", "site", "website", "site web"], apply: (v, o) => { o.websiteUrl = normalizeUrl(v) ?? undefined; } },
  {
    key: "platformLinks", label: "Linkuri platforme (Booking, Facebook…)",
    aliases: ["booking facebook alte linkuri", "alte linkuri", "linkuri", "platforme"], apply: (v, o) => classifyLinks(v, o),
  },
  { key: "bookingUrl", label: "Link Booking", aliases: ["booking", "link booking"], apply: (v, o) => { o.bookingUrl = normalizeUrl(v) ?? undefined; } },
  { key: "facebookUrl", label: "Link Facebook", aliases: ["facebook", "link facebook"], apply: (v, o) => { o.facebookUrl = normalizeUrl(v) ?? undefined; } },
  { key: "instagramUrl", label: "Link Instagram", aliases: ["instagram", "link instagram"], apply: (v, o) => { o.instagramUrl = normalizeUrl(v) ?? undefined; } },
  { key: "manualCheckNote", label: "Verificare manuală", aliases: ["verificare manuala", "de verificat", "nota verificare"], apply: (v, o) => { o.manualCheckNote = str(v) || undefined; } },
  { key: "googleMapsUrl", label: "Link Google Maps", aliases: ["cauta pe google maps", "google maps", "link google maps"], apply: (v, o) => { o.googleMapsUrl = normalizeUrl(v) ?? undefined; } },
  { key: "starsOsm", label: "Stele (OSM)", aliases: ["stele osm", "stele"], apply: (v, o) => { const n = parseIntLoose(v); if (n !== null && n >= 0 && n <= 5) o.starsOsm = n; } },
  { key: "categoryMinistry", label: "Categorie (minister)", aliases: ["categorie minister", "categorie", "clasificare"], apply: (v, o) => { o.categoryMinistry = str(v) || undefined; } },
  {
    key: "roomsPlaces", label: "Camere / locuri", aliases: ["camere locuri", "camere", "capacitate"],
    apply: (v, o) => {
      const nums = (v.match(/\d+/g) ?? []).map(Number);
      if (nums[0] !== undefined) o.roomsCount = nums[0];
      if (nums[1] !== undefined) o.placesCount = nums[1];
    },
  },
  { key: "placesCount", label: "Locuri", aliases: ["locuri", "paturi"], apply: (v, o) => { const n = parseIntLoose(v); if (n !== null) o.placesCount = n; } },
  { key: "inMinistryList", label: "În lista ministerului", aliases: ["in lista ministerului", "lista minister"], apply: (v, o) => { o.inMinistryList = parseYesNo(v); } },
  { key: "operatorName", label: "Operator (firmă)", aliases: ["operator minister", "operator", "firma", "societate"], apply: (v, o) => { o.operatorName = str(v) || undefined; } },
  { key: "operatorCui", label: "CUI operator", aliases: ["cui", "cod fiscal", "cif"], apply: (v, o) => { const c = v.replace(/\s/g, "").toUpperCase(); o.operatorCui = c || undefined; } },
  { key: "source", label: "Sursă", aliases: ["sursa", "source"], apply: (v, o) => { o.source = parseSource(v); } },
  {
    key: "osmUrl", label: "Link OSM", aliases: ["link osm", "osm", "openstreetmap"],
    apply: (v, o) => { const u = normalizeUrl(v); if (u) { o.osmUrl = u; o.osmId = osmIdFromUrl(u) ?? undefined; } },
  },
  { key: "latitude", label: "Latitudine", aliases: ["lat", "latitudine", "latitude"], apply: (v, o) => { const n = parseNumber(v); if (n !== null && Math.abs(n) <= 90) o.latitude = n; } },
  { key: "longitude", label: "Longitudine", aliases: ["lon", "lng", "longitudine", "longitude"], apply: (v, o) => { const n = parseNumber(v); if (n !== null && Math.abs(n) <= 180) o.longitude = n; } },
];

export const TARGET_BY_KEY = new Map(TARGET_FIELDS.map((f) => [f.key, f]));

/** Coloana din fișier -> cheia câmpului țintă (sau "" = ignorată). */
export type ColumnMap = Record<string, string>;

export function autoDetectColumnMap(headers: string[]): ColumnMap {
  const map: ColumnMap = {};
  const used = new Set<string>();
  for (const h of headers) {
    const n = normalizeText(h);
    const hit = TARGET_FIELDS.find((f) => !used.has(f.key) && f.aliases.includes(n));
    map[h] = hit ? hit.key : "";
    if (hit) used.add(hit.key);
  }
  return map;
}

export type MappedRow = { ok: true; data: LeadImportData } | { ok: false; error: string };

/** Aplică maparea pe un rând brut din fișier. */
export function mapRow(raw: Record<string, string>, columnMap: ColumnMap): MappedRow {
  const draft: Draft = {};
  for (const [column, key] of Object.entries(columnMap)) {
    if (!key) continue;
    const field = TARGET_BY_KEY.get(key);
    const value = raw[column];
    if (!field || value === undefined || value === null || String(value).trim() === "") continue;
    field.apply(String(value), draft);
  }
  const name = draft._name?.trim();
  if (!name) return { ok: false, error: "Rândul nu are nume." };
  const { _name, _zoneText, ...rest } = draft;
  void _name;
  const data: LeadImportData = {
    ...rest,
    name,
    nameNormalized: normalizeName(name),
    zone: parseZone(_zoneText ?? ""),
  };
  for (const k of Object.keys(data) as (keyof LeadImportData)[]) {
    if (data[k] === undefined) delete data[k];
  }
  return { ok: true, data };
}
