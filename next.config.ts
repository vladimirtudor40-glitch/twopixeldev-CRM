import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // „standalone” = un server Node autonom, pe care programul de Windows îl pornește local
  output: "standalone",
  experimental: {
    serverActions: {
      // fișierele Excel exportate de script au ~200 KB; lăsăm loc pentru liste mai mari
      bodySizeLimit: "10mb",
    },
  },
  serverExternalPackages: ["exceljs"],
  // Singura imagine e logo-ul; fără optimizare programul de Windows nu are nevoie de „sharp”
  images: { unoptimized: true },
  // Pachete folosite (indirect) de exceljs pe care trasarea Next nu le copiază complet:
  // Node 22+ încarcă varianta „module-sync” (require.mjs), pe care trasarea nu o urmărește.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/generator-function/**/*", "./node_modules/async-function/**/*", "./data/import/**/*"],
  },
};

export default nextConfig;
