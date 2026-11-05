/**
 * Date inițiale: primul utilizator ADMIN și șabloanele de ofertă.
 * Rulează: npm run db:seed (citește SEED_ADMIN_* din .env)
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_OFFER_TEMPLATES } from "./offer-templates";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Admin";
  if (!email || !password) throw new Error("Setează SEED_ADMIN_EMAIL și SEED_ADMIN_PASSWORD în .env.");
  if (password.length < 10) throw new Error("Parola de admin trebuie să aibă cel puțin 10 caractere.");

  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await db.user.upsert({
    where: { email },
    update: { role: "ADMIN", active: true },
    create: { email, name, role: "ADMIN", passwordHash },
  });
  console.log(`Admin: ${admin.email}`);

  for (const t of DEFAULT_OFFER_TEMPLATES) {
    const existing = await db.offerTemplate.findFirst({ where: { name: t.name } });
    if (!existing) await db.offerTemplate.create({ data: { ...t, createdById: admin.id } });
  }
  console.log("Șabloane de ofertă: Esențial, Standard, Premium");
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
