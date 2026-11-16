import type { LeadCategory } from "@prisma/client";
import Papa from "papaparse";
import { normalizeName, normalizePhone, normalizeText, normalizeUrl } from "@/lib/normalize";
import { parseZone } from "@/server/import/fields";

/**
 * Rezultatele căutării pe Google Maps (google-maps-scraper scrie un CSV cu coloanele lui)
 * și transformarea lor în rânduri de import pentru CRM. Funcții pure, testate în tests/lead-search.test.ts.
 */

/** Ce fel de prezență online are firma: site propriu, doar o pagină pe o platformă, sau nimic. */
export type SiteKind = "own" | "platform" | "none";

export type GmapsPlace = {
  /** poziția în fișier (0 = primul rând după antet); identifică rândul la import */
  index: number;
  title: string;
  category: string;
  address: string;
  /** localitatea (din „complete_address”, altfel ultima parte a adresei); din ea se stabilește zona */
  locality: string;
  phone: string;
  website: string;
  siteKind: SiteKind;
  rating: number | null;
  reviews: number | null;
  link: string;
  emails: string[];
  latitude: number | null;
  longitude: number | null;
  placeId: string;
};

/** Platforme de programări / rețele sociale: o firmă care are doar așa ceva nu are site propriu. */
const PLATFORM_HOSTS = [
  "facebook.com", "fb.com", "instagram.com", "tiktok.com", "booking.com", "mero.ro", "fresha.com", "booksy.com",
  "treatwell.ro", "linktr.ee", "wa.me", "whatsapp.com", "google.com", "business.site", "g.page", "travelminit.ro",
  "airbnb.com", "airbnb.ro", "tripadvisor.com", "tripadvisor.ro", "glovoapp.com", "tazz.ro", "foodpanda.ro",
  "bolt.eu", "youtube.com", "calendly.com", "setmore.com", "simplybook.me",
];

export function siteKind(website: string | null | undefined): SiteKind {
  const url = normalizeUrl(website ?? "");
  if (!url) return "none";
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "own";
  }
  return PLATFORM_HOSTS.some((p) => host === p || host.endsWith(`.${p}`)) ? "platform" : "own";
}

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Coloana „emails” vine ca listă JSON („[]”, „["a@b.ro"]”) sau text; păstrăm adresele unice. */
export function parseEmails(raw: string | null | undefined): string[] {
  if (!raw) return [];
  const found = raw.match(EMAIL_RE) ?? [];
  return [...new Set(found.map((e) => e.toLowerCase()))].filter((e) => !/\.(png|jpe?g|gif|webp|svg)$/.test(e));
}

/**
 * Localitatea firmei. Nu folosim toată adresa la zonă: „Bulevardul Mamaia 113, 900657 Constanța”
 * e în Constanța, nu în Mamaia.
 */
export function localityOf(completeAddress: string | null | undefined, address: string | null | undefined): string {
  if (completeAddress) {
    try {
      const o = JSON.parse(completeAddress) as { city?: unknown };
      if (typeof o.city === "string" && o.city.trim()) return o.city.trim();
    } catch {
      // nu e JSON: folosim adresa
    }
  }
  const parts = (address ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return (parts[parts.length - 1] ?? "").replace(/\b\d{6}\b/g, "").trim();
}

const num = (v: string | undefined): number | null => {
  if (!v) return null;
  const n = Number(String(v).trim().replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Citește CSV-ul scris de google-maps-scraper. */
export function parseGmapsCsv(text: string): GmapsPlace[] {
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const parsed = Papa.parse<Record<string, string>>(clean, { header: true, skipEmptyLines: "greedy" });
  const out: GmapsPlace[] = [];
  parsed.data.forEach((row, index) => {
    const title = (row.title ?? "").trim();
    if (!title) return;
    const website = (row.website ?? "").trim();
    const rating = num(row.review_rating);
    out.push({
      index,
      title,
      category: (row.category ?? "").trim(),
      address: (row.address ?? "").trim(),
      locality: localityOf(row.complete_address, row.address),
      phone: (row.phone ?? "").trim(),
      website,
      siteKind: siteKind(website),
      rating: rating && rating > 0 ? Math.round(rating * 10) / 10 : null,
      reviews: num(row.review_count),
      link: (row.link ?? "").trim(),
      emails: parseEmails(row.emails),
      latitude: num(row.latitude),
      longitude: num(row.longitude),
      placeId: (row.place_id ?? "").trim(),
    });
  });
  return out;
}

/** Antetele rândurilor de import, recunoscute automat de import (vezi TARGET_FIELDS). */
export const IMPORT_HEADERS = [
  "Nume", "Categorie lead", "Tip", "Zona", "Adresa", "Telefon", "Email", "Status site", "Site propriu",
  "Booking / Facebook / alte linkuri", "Cauta pe Google Maps", "Rating Google", "Lat", "Lon", "Sursa",
] as const;

const CATEGORY_TEXT: Record<LeadCategory, string> = {
  HOTELURI: "Hoteluri",
  BARBERSHOPURI: "Barbershopuri",
  RESTAURANTE: "Restaurante",
  ACTIVITATI: "Activitati",
  SALOANE_BEAUTY: "Saloane beauty",
};

/** Un rând din Google Maps ca rând de import CRM (aceleași coloane ca exportul scriptului). */
export function toImportRaw(p: GmapsPlace, category: LeadCategory): Record<string, string> {
  const status = p.siteKind === "own" ? "Are site propriu" : p.siteKind === "platform" ? "Doar Booking / Facebook / platforme" : "Fara site";
  return {
    "Nume": p.title,
    "Categorie lead": CATEGORY_TEXT[category],
    "Tip": p.category,
    "Zona": p.locality,
    "Adresa": p.address,
    "Telefon": p.phone,
    "Email": p.emails[0] ?? "",
    "Status site": status,
    "Site propriu": p.siteKind === "own" ? p.website : "",
    "Booking / Facebook / alte linkuri": p.siteKind === "platform" ? p.website : "",
    "Cauta pe Google Maps": p.link,
    "Rating Google": p.rating !== null ? String(p.rating) : "",
    "Lat": p.latitude !== null ? String(p.latitude) : "",
    "Lon": p.longitude !== null ? String(p.longitude) : "",
    "Sursa": "Google Maps",
  };
}

/** Cheile după care recunoaștem o firmă deja aflată în CRM (orice categorie). */
export function placeKeys(p: Pick<GmapsPlace, "title" | "locality" | "phone">) {
  return { nameZone: `${normalizeName(p.title)}|${parseZone(p.locality)}`, phone: normalizePhone(p.phone) };
}

/** Categoria propusă după textul căutării („frizerie Constanța” → Barbershopuri). */
export function guessCategory(query: string): LeadCategory | null {
  const t = normalizeText(query);
  if (!t) return null;
  if (/(barber|frizer|frizur)/.test(t)) return "BARBERSHOPURI";
  if (/(salon|beauty|coafur|manichiur|cosmetic|unghii|spa\b|nail)/.test(t)) return "SALOANE_BEAUTY";
  if (/(restaurant|cafenea|cafe|bar\b|pizzer|bistro|fast food|terasa|shaormer|patiser|cofetar)/.test(t)) return "RESTAURANTE";
  if (/(hotel|pensiun|vila|cazare|hostel|motel|camping|apartament|regim hotelier)/.test(t)) return "HOTELURI";
  if (/(activitat|parc|escape|karting|paintball|muzeu|tur |inchiriere|plaja|beach|club|bowling|sala)/.test(t)) return "ACTIVITATI";
  return null;
}

/** „leaduri-frizerie-constanta-2026-11-14-0859-fara-site.csv” → „frizerie constanta (fără site)”. */
export function labelFromFileName(name: string): string {
  let s = name.replace(/\.csv$/i, "").replace(/^leaduri-/, "");
  const noSite = /-fara-site$/.test(s);
  s = s.replace(/-fara-site$/, "").replace(/-?\d{4}-\d{2}-\d{2}-\d{4}$/, "").replace(/-/g, " ").trim();
  if (!s) s = "căutare";
  return noSite ? `${s} (fără site)` : s;
}

/** Numele fișierului de rezultate: leaduri-<căutare>-AAAA-LL-ZZ-HHMM.csv (ca în aplicația separată). */
export function resultFileName(query: string, now: Date): string {
  let slug = normalizeText(query).replace(/\s+/g, "-").slice(0, 40).replace(/-+$/, "");
  if (!slug) slug = "cautare";
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  return `leaduri-${slug}-${stamp}.csv`;
}

/** Interpretează o linie din jurnalul scraper-ului (JSON) într-un mesaj scurt în română. */
export function describeLogLine(line: string): { msg: string | null; found?: boolean; failed?: boolean } {
  if (line.startsWith("{")) {
    let m: Record<string, unknown>;
    try {
      m = JSON.parse(line) as Record<string, unknown>;
    } catch {
      return { msg: null };
    }
    const job = typeof m.job === "string" ? m.job : "";
    const status = m.status;
    const message = m.message;
    const isPlace = job.includes("/maps/place/");
    if (message === "job finished" && isPlace && status === "success") return { msg: `✓ ${placeName(job)}`, found: true };
    if (message === "job finished" && status === "failed") return { msg: `✗ eșuat: ${String(m.error ?? "")}`.trim(), failed: true };
    if (message === "job finished") return { msg: "→ listă de rezultate procesată" };
    if (message === "starting scrapemate") return { msg: "→ pornesc browserul și caut pe Google Maps…" };
    if (message === "scrapemate exited") return { msg: "→ gata" };
    return { msg: null };
  }
  if (line.includes("Downloading") && line.includes("browsers")) {
    return { msg: "→ verific browserul Chromium (prima dată se descarcă ~300 MB, câteva minute)…" };
  }
  if (line.includes("Downloaded") && line.includes("successfully")) return { msg: "→ browser pregătit" };
  return { msg: null };
}

function placeName(job: string): string {
  const m = /\/maps\/place\/([^/]+)\//.exec(job);
  if (!m) return "firmă";
  const raw = m[1]!.replace(/\+/g, " ");
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
