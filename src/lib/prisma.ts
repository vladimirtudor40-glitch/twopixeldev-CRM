import { PrismaClient } from "@prisma/client";

// Un singur client (și un singur grup de conexiuni) pe proces, păstrat pe globalThis și în producție:
// Next împachetează separat instrumentation.ts și paginile, iar fără asta fiecare și-ar deschide
// propriile conexiuni la Supabase, iar cele deschise din start (vezi instrumentation.ts) n-ar folosi paginilor.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

globalForPrisma.prisma = prisma;
