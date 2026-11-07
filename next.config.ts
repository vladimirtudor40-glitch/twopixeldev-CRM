import type { NextConfig } from "next";

// Versiunea web (CRM_MODE=web): rulează pe Cloudflare (OpenNext) și se deschide din site,
// la twopixeldev.com/app/crm (vezi src/lib/web.ts). Fără variabilă: programul de Windows, ca până acum.
const web = process.env.CRM_MODE === "web";
const basePath = web ? "/app/crm" : "";

const nextConfig: NextConfig = {
  ...(web ? { basePath } : {}),
  // valori fixate la build, citite și în middleware
  env: { CRM_MODE: web ? "web" : "desktop", CRM_BASE_PATH: basePath },
  // „standalone” = un server Node autonom, pe care programul de Windows îl pornește local
  output: "standalone",
  experimental: {
    serverActions: {
      // fișierele Excel exportate de script au ~200 KB; lăsăm loc pentru liste mai mari
      bodySizeLimit: "10mb",
    },
  },
  // Pe Cloudflare, Prisma trebuie lăsat în afara bundle-ului Next, ca OpenNext să ia varianta lui pentru
  // Workers (motorul WebAssembly), nu pe cea de Node.
  serverExternalPackages: web ? ["exceljs", "@prisma/client", ".prisma/client"] : ["exceljs"],
  // Singura imagine e logo-ul; fără optimizare programul de Windows nu are nevoie de „sharp”
  images: { unoptimized: true },
  // Pachete folosite (indirect) de exceljs pe care trasarea Next nu le copiază complet:
  // Node 22+ încarcă varianta „module-sync” (require.mjs), pe care trasarea nu o urmărește.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/generator-function/**/*", "./node_modules/async-function/**/*", "./data/import/**/*"],
  },
};

export default nextConfig;
