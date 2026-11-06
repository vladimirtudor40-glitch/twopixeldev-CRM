/**
 * electron-builder sare peste folderele node_modules din „extraResources”,
 * așa că serverul Next.js (cu node_modules-urile lui) e copiat aici, după împachetare.
 */
const fs = require("node:fs");
const path = require("node:path");

exports.default = async function afterPack(context) {
  const src = path.join(context.packager.projectDir, "dist-desktop", "resources", "server");
  if (!fs.existsSync(path.join(src, "server.js"))) {
    throw new Error("Lipsește dist-desktop/resources/server. Rulează `npm run build && npm run desktop:prepare`.");
  }
  const resources =
    context.electronPlatformName === "darwin"
      ? path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`, "Contents", "Resources")
      : path.join(context.appOutDir, "resources");
  const dest = path.join(resources, "server");
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
  const engine = fs.readdirSync(path.join(dest, "node_modules", ".prisma", "client")).filter((f) => f.includes("query_engine"));
  console.log(`  • server copiat în ${path.relative(context.packager.projectDir, dest)} (motor Prisma: ${engine.join(", ")})`);
};
