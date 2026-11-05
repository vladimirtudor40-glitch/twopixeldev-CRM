/**
 * Pregătește programul de Windows:
 *  1. compilează procesul principal Electron (desktop/src) în desktop/app/
 *  2. copiază serverul Next.js „standalone”, fișierele statice și migrările în dist-desktop/resources/
 * Rulează după `npm run build`. Cu --only-main sare peste pasul 2.
 */
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const appDir = path.join(root, "desktop", "app");
const resources = path.join(root, "dist-desktop", "resources");
const onlyMain = process.argv.includes("--only-main");

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

fs.writeFileSync(
  path.join(appDir, "package.json"),
  JSON.stringify(
    {
      name: "twopixeldev-crm",
      productName: "twopixeldev CRM",
      version: rootPkg.version,
      description: "CRM intern twopixeldev pentru unitățile de cazare de pe litoral",
      author: "twopixeldev",
      main: "main.js",
      private: true,
    },
    null,
    2,
  ) + "\n",
);

await build({
  entryPoints: {
    main: path.join(root, "desktop", "src", "main.ts"),
    preload: path.join(root, "desktop", "src", "preload.ts"),
  },
  outdir: appDir,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  external: ["electron", "pg-native"],
  sourcemap: false,
  minify: false,
  legalComments: "none",
  logLevel: "info",
});

if (!onlyMain) {
  const standalone = path.join(root, ".next", "standalone");
  if (!fs.existsSync(path.join(standalone, "server.js"))) {
    console.error("Lipsește .next/standalone/server.js. Rulează întâi `npm run build`.");
    process.exit(1);
  }
  fs.rmSync(resources, { recursive: true, force: true });
  const server = path.join(resources, "server");
  fs.cpSync(standalone, server, { recursive: true, verbatimSymlinks: false, dereference: true });
  fs.cpSync(path.join(root, ".next", "static"), path.join(server, ".next", "static"), { recursive: true });
  fs.cpSync(path.join(root, "public"), path.join(server, "public"), { recursive: true });
  // Nu livrăm niciodată fișierele .env locale în installer
  for (const f of fs.readdirSync(server)) {
    if (f.startsWith(".env")) fs.rmSync(path.join(server, f), { force: true });
  }
  // Imaginile nu sunt optimizate (images.unoptimized), deci „sharp” nu e folosit niciodată
  for (const dir of ["sharp", "@img"]) fs.rmSync(path.join(server, "node_modules", dir), { recursive: true, force: true });
  fs.cpSync(path.join(root, "prisma", "migrations"), path.join(resources, "migrations"), { recursive: true });
  const engines = fs
    .readdirSync(path.join(server, "node_modules", ".prisma", "client"))
    .filter((f) => f.includes("query_engine"));
  if (engines.length === 0) {
    console.error("Motorul Prisma lipsește din serverul standalone.");
    process.exit(1);
  }
  console.log(`Resurse pregătite în ${path.relative(root, resources)} (motor Prisma: ${engines.join(", ")})`);
}
