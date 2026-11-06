/** Pornirea serverului (doar runtime-ul Node.js, nu edge): vezi instrumentation.ts. */
export async function registerNode() {
  // nici în timpul `next build`: doar serverul pornit cu adevărat lucrează cu baza de date
  if (!process.env.DATABASE_URL || process.env.NEXT_PHASE === "phase-production-build") return;
  const { prisma } = await import("@/lib/prisma");
  // câte o interogare pentru fiecare conexiune din grup (connection_limit=5), ca toate să fie deja deschise
  // când prima pagină le cere în paralel
  // fără await: serverul începe să răspundă imediat, conexiunile se deschid în fundal
  void Promise.all(Array.from({ length: 5 }, () => prisma.$queryRaw`SELECT 1`)).catch(() => {
    // fără conexiune acum: prima pagină o va reîncerca și va afișa eroarea
  });
  // Lead-urile incluse în program (data/import) se importă o singură dată, în fundal.
  const { runAutoImports } = await import("@/server/import/auto");
  void runAutoImports(prisma).catch((e: unknown) => {
    console.error("Importul automat nu a reușit:", e instanceof Error ? e.message : e);
  });
}
