// Versiunea web a CRM-ului (Cloudflare Workers). Pornește comenzile OpenNext / Wrangler cu CRM_MODE=web,
// la fel pe Windows și pe Linux.  node scripts/web.mjs build | preview | deploy
import { spawnSync } from "node:child_process";

const steps = {
  build: [["npx", ["prisma", "generate"]], // Next 15 a ieșit din suportul „oficial” de 2 ani, dar primește încă patch-uri (15.5.x); trecerea la Next 16 e separată
    ["npx", ["opennextjs-cloudflare", "build", "--dangerouslyUseUnsupportedNextVersion"]]],
  preview: [["npx", ["opennextjs-cloudflare", "preview"]]],
  deploy: [["npx", ["opennextjs-cloudflare", "deploy"]]],
};
const cmd = process.argv[2];
if (!steps[cmd]) {
  console.error("Folosire: node scripts/web.mjs build | preview | deploy");
  process.exit(1);
}
for (const [bin, args] of steps[cmd]) {
  const r = spawnSync(bin, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, CRM_MODE: "web" } });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
