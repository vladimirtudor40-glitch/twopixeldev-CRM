/**
 * Rulează o dată, când pornește serverul aplicației.
 * Deschidem conexiunile la baza de date imediat, în timp ce fereastra programului se încarcă,
 * ca prima pagină să nu mai aștepte conectarea (TLS + autentificare) la Supabase.
 */
export async function register() {
  // verificarea scrisă așa permite bundler-ului să scoată codul Node (fs, crypto, Prisma) din varianta edge
  // Versiunea web (Worker Cloudflare, CRM_MODE=web) nu are un server care să rămână pornit:
  // fără conexiuni deschise dinainte și fără import automat (se importă din Import).
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.CRM_MODE !== "web") {
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }
}
