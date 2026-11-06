/**
 * Rulează o dată, când pornește serverul aplicației.
 * Deschidem conexiunile la baza de date imediat, în timp ce fereastra programului se încarcă,
 * ca prima pagină să nu mai aștepte conectarea (TLS + autentificare) la Supabase.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.DATABASE_URL) return;
  const { prisma } = await import("@/lib/prisma");
  // câte o interogare pentru fiecare conexiune din grup (connection_limit=5), ca toate să fie deja deschise
  // când prima pagină le cere în paralel
  // fără await: serverul începe să răspundă imediat, conexiunile se deschid în fundal
  void Promise.all(Array.from({ length: 5 }, () => prisma.$queryRaw`SELECT 1`)).catch(() => {
    // fără conexiune acum: prima pagină o va reîncerca și va afișa eroarea
  });
}
