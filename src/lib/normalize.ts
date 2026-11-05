/**
 * Normalizare pentru căutare și deduplicare.
 * Toate funcțiile sunt pure și testate în tests/normalize.test.ts.
 */

/** „Pensiunea Ștefănia” -> „pensiunea stefania”. Acoperă și ş/ţ cu sedilă. */
export function stripDiacritics(input: string): string {
  return input.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Lowercase, fără diacritice, doar litere/cifre, spații simple. */
export function normalizeText(input: string | null | undefined): string {
  if (!input) return "";
  return stripDiacritics(input)
    .toLowerCase()
    .replace(/&/g, " si ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Cuvinte care descriu tipul unității și nu ajută la identificare. */
const TYPE_WORDS = new Set([
  "pensiunea", "pensiune", "vila", "villa", "vile", "hotel", "hotelul", "hostel", "hostelul",
  "motel", "camping", "campingul", "apartamente", "apartament", "apartments", "apartment",
  "casa", "casuta", "complex", "complexul", "resort", "residence", "rezidence", "guesthouse",
  "guest", "house", "cazare", "regim", "hotelier", "sc", "srl",
]);

/**
 * Numele folosit la deduplicare: fără diacritice și fără cuvintele de tip
 * („Pensiunea Maria” și „Vila Maria” devin amândouă „maria”).
 * Dacă după eliminare nu rămâne nimic (ex. „Hotel”), păstrăm textul normalizat.
 */
export function normalizeName(input: string | null | undefined): string {
  const base = normalizeText(input);
  const kept = base.split(" ").filter((w) => w && !TYPE_WORDS.has(w));
  return kept.length ? kept.join(" ") : base;
}

/**
 * Telefon doar cu cifre, în format național când e număr românesc:
 * „+40 341 103 874” -> „0341103874”, „0040 722…” -> „0722…”.
 * Dacă sunt mai multe numere („0722… / 0241…”), îl păstrează pe primul.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const first = String(input).split(/[;,/|]| sau /i)[0] ?? "";
  let digits = first.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("0040")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("40") && digits.length === 11) digits = "0" + digits.slice(2);
  else if (digits.length === 9 && /^[237]/.test(digits)) digits = "0" + digits;
  return digits.length >= 6 ? digits : null;
}

/** Telefon afișabil: „0722 123 456” / „0241 123 456”. Numerele străine rămân cum sunt. */
export function formatPhone(normalized: string | null | undefined): string {
  if (!normalized) return "";
  if (/^0\d{9}$/.test(normalized)) {
    return `${normalized.slice(0, 4)} ${normalized.slice(4, 7)} ${normalized.slice(7)}`;
  }
  return normalized;
}

/** Cheia de deduplicare: nume|zonă|telefon (telefonul poate lipsi). */
export function dedupeKey(nameNormalized: string, zone: string, phoneNormalized: string | null): string {
  return `${nameNormalized}|${zone}|${phoneNormalized ?? ""}`;
}

/** Textul în care se caută (nume, adresă, telefon, email, operator, CUI, persoane). */
export function buildSearchText(parts: Array<string | null | undefined>): string {
  const words = new Set<string>();
  for (const p of parts) {
    if (!p) continue;
    const n = normalizeText(p);
    if (n) words.add(n);
    const digits = String(p).replace(/\D/g, "");
    if (digits.length >= 6) words.add(digits);
  }
  return Array.from(words).join(" ");
}

/** Transformă ce scrie utilizatorul în termeni de căutare (AND). */
export function searchTerms(query: string | null | undefined): string[] {
  const n = normalizeText(query);
  if (!n) return [];
  // „0722 123 456” trebuie să găsească numărul scris legat
  if (/^[\d\s]+$/.test(n)) {
    const d = n.replace(/\s/g, "");
    const p = normalizePhone(d);
    return [p ?? d];
  }
  return n.split(" ").filter(Boolean);
}

/** „node/123456” din „https://www.openstreetmap.org/node/123456”. */
export function osmIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = /openstreetmap\.org\/(node|way|relation)\/(\d+)/i.exec(url);
  return m ? `${m[1]!.toLowerCase()}/${m[2]}` : null;
}

/** Număr cu virgulă sau punct zecimal; null dacă nu e număr. */
export function parseNumber(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const s = String(input).trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Primul număr întreg dintr-un text („20 camere / 45 locuri” -> 20). */
export function parseIntLoose(input: unknown): number | null {
  if (input === null || input === undefined || input === "") return null;
  if (typeof input === "number") return Number.isFinite(input) ? Math.round(input) : null;
  const m = /\d+/.exec(String(input));
  return m ? Number(m[0]) : null;
}

/** Adaugă https:// dacă lipsește; null pentru text care nu arată a link. */
export function normalizeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[\w.-]+\.[a-z]{2,}(\/.*)?$/i.test(s)) return `https://${s}`;
  return null;
}
