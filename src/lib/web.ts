/**
 * Versiunea web a CRM-ului, inclusă în site-ul twopixeldev.com la /app/ → Clienți.
 *
 * Build-ul web (CRM_MODE=web, vezi next.config.ts și wrangler.jsonc) rulează ca Worker Cloudflare, la
 * adresa /app/crm a site-ului. Nu are login propriu: Worker-ul site-ului verifică sesiunea site-ului și
 * trimite cererea mai departe cu emailul contului în antetul x-tpd-user, plus secretul comun
 * CRM_PROXY_SECRET în x-tpd-proxy. O cerere fără secretul corect nu primește nimic.
 *
 * Fără dependențe de Node: e folosit și în middleware.
 */
export const WEB_MODE = process.env.CRM_MODE === "web";

/** Calea la care stă CRM-ul în site („/app/crm”); goală în programul de Windows. */
export const BASE_PATH = process.env.CRM_BASE_PATH ?? "";

/** Adresa unui fișier din public/, cu prefixul site-ului (next/image nu-l adaugă singur). */
export const asset = (path: string) => `${BASE_PATH}${path}`;

export const PROXY_USER_HEADER = "x-tpd-user";
export const PROXY_SECRET_HEADER = "x-tpd-proxy";

const enc = new TextEncoder();

/** Comparație în timp constant, ca durata să nu spună cât din secret s-a nimerit. */
function sameText(a: string, b: string): boolean {
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

/**
 * Emailul contului din site, dacă cererea vine de la Worker-ul site-ului (secretul se potrivește);
 * altfel null. Un secret lipsă sau mai scurt de 32 de caractere închide CRM-ul cu totul.
 */
export function proxiedEmail(headers: Headers): string | null {
  const secret = process.env.CRM_PROXY_SECRET ?? "";
  const given = headers.get(PROXY_SECRET_HEADER) ?? "";
  if (secret.length < 32 || !sameText(given, secret)) return null;
  const email = (headers.get(PROXY_USER_HEADER) ?? "").trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

/**
 * Contul din CRM pentru un cont din site. Implicit același email; CRM_USER_MAP (JSON
 * {"email-site": "email-crm"}) leagă un cont din site de un cont CRM cu alt email.
 */
export function crmEmailFor(siteEmail: string): string {
  try {
    const map = JSON.parse(process.env.CRM_USER_MAP || "{}") as Record<string, unknown>;
    const mapped = map[siteEmail];
    if (typeof mapped === "string" && mapped.includes("@")) return mapped.trim().toLowerCase();
  } catch {
    // o hartă greșită nu blochează accesul: rămâne emailul din site
  }
  return siteEmail;
}
