/**
 * „Ține-mă minte” la autentificare.
 *
 * Cookie-ul de sesiune Auth.js e mereu persistent (30 de zile), iar Auth.js îi reînnoiește expirarea
 * la fiecare cerere, așa că nu-l putem face „cookie de sesiune” direct. Când „Ține-mă minte” nu e bifat,
 * punem în token `remember: false` și un id aleator (`sid`) și setăm în paralel cookie-ul de mai jos,
 * FĂRĂ dată de expirare: browserul / programul îl șterge la închidere. Sesiunea e valabilă doar cât
 * timp există acest cookie cu același id; după repornire, contul cere din nou parola.
 *
 * Fără dependențe de Node: e folosit și în middleware (Edge).
 */
export const TEMP_SESSION_COOKIE = "tpd.sesiune-temporara";

export type RememberClaims = { remember?: boolean; sid?: string } | null | undefined;

/** true dacă sesiunea e „ține-mă minte” sau dacă cookie-ul temporar se potrivește cu id-ul din token. */
export function isSessionAlive(claims: RememberClaims, tempCookie: string | undefined): boolean {
  if (!claims || claims.remember !== false) return true;
  return !!claims.sid && tempCookie === claims.sid;
}
