// Build-ul versiunii web a CRM-ului (Netlify, vezi netlify.toml și docs/WEB.md).
// Prisma primește și motorul pentru serverele Netlify (Amazon Linux, „rhel-openssl-3.0.x”), dintr-o copie
// temporară a schemei: schema din repo rămâne neschimbată, deci programul de Windows nu ia motorul în plus.
import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, writeFileSync } from "node:fs";

const env = { ...process.env, CRM_MODE: "web" };
const run = (args) => {
  const r = spawnSync("npx", args, { stdio: "inherit", shell: process.platform === "win32", env });
  if (r.status !== 0) process.exit(r.status ?? 1);
};

const schema = readFileSync("prisma/schema.prisma", "utf8");
const marker = 'provider        = "prisma-client-js"';
if (!schema.includes(marker)) throw new Error("Nu găsesc generatorul prisma-client-js în schema.prisma");
const webSchema = "prisma/schema.web.prisma";
writeFileSync(webSchema, schema.replace(marker, `${marker}\n  binaryTargets   = ["native", "rhel-openssl-3.0.x"]`));
try {
  run(["prisma", "generate", "--schema", webSchema]);
} finally {
  rmSync(webSchema, { force: true });
}
run(["next", "build"]);
