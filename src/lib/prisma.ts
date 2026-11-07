import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { WEB_MODE } from "./web";

// Programul de Windows: un singur client (și un singur grup de conexiuni) pe proces, păstrat pe
// globalThis și în producție: Next împachetează separat instrumentation.ts și paginile, iar fără asta
// fiecare și-ar deschide propriile conexiuni la Supabase, iar cele deschise din start (vezi
// instrumentation.ts) n-ar folosi paginilor.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function desktopClient(): PrismaClient {
  globalForPrisma.prisma ??= new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });
  return globalForPrisma.prisma;
}

/**
 * Versiunea web rulează ca Worker Cloudflare: o conexiune deschisă într-o cerere nu poate fi folosită
 * în alta, așa că fiecare cerere primește clientul ei, legat prin driverul „pg”. Cererea e recunoscută
 * după contextul pus de OpenNext (același obiect pe toată durata cererii). Cu Hyperdrive (legătura
 * HYPERDRIVE din wrangler.jsonc) conexiunile la Supabase rămân deschise între cereri, în rețeaua
 * Cloudflare; fără el se folosește DATABASE_URL.
 */
type CfContext = { env?: { HYPERDRIVE?: { connectionString?: string } } };
const requestClients = new WeakMap<object, PrismaClient>();
let outsideRequest: PrismaClient | undefined;

function webClient(): PrismaClient {
  const cf = (globalThis as Record<symbol, CfContext | undefined>)[Symbol.for("__cloudflare-context__")];
  const create = () =>
    new PrismaClient({
      adapter: new PrismaPg({ connectionString: cf?.env?.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL, max: 3 }),
      log: ["error"],
    });
  if (!cf) return (outsideRequest ??= create()); // `next dev` / build, în afara unui Worker
  let client = requestClients.get(cf);
  if (!client) {
    client = create();
    requestClients.set(cf, client);
  }
  return client;
}

export const prisma: PrismaClient = WEB_MODE
  ? new Proxy({} as PrismaClient, {
      get(_target, prop) {
        const client = webClient();
        const value = Reflect.get(client, prop, client) as unknown;
        return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(client) : value;
      },
    })
  : desktopClient();
