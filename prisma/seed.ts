/**
 * Date inițiale: primul utilizator ADMIN și șabloanele de ofertă.
 * Rulează: npm run db:seed (citește SEED_ADMIN_* din .env)
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

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

  const templates = [
    {
      name: "Esențial", setupPrice: 1500, monthlyFee: 150,
      description: "Site de prezentare simplu + buton „Rezervă acum”.",
      includedFeatures: ["Site de prezentare (până la 5 pagini)", "Motor de rezervări directe", "Sincronizare iCal cu Booking", "Domeniu .ro inclus în primul an"],
    },
    {
      name: "Standard", setupPrice: 2500, monthlyFee: 250, isDefault: true,
      description: "Pachetul recomandat pentru pensiuni și vile.",
      includedFeatures: ["Site de prezentare complet, cu galerie și pagină pentru fiecare cameră", "Motor de rezervări directe", "Sincronizare iCal cu Booking și Airbnb", "Plată online cu cardul și card de vacanță", "Emailuri automate de confirmare", "Panou de administrare (PMS)"],
    },
    {
      name: "Premium", setupPrice: 4000, monthlyFee: 400,
      description: "Pentru hoteluri și unități mari.",
      includedFeatures: ["Tot din Standard", "Site multilingv (RO / EN)", "Tarife sezoniere și coduri de reducere", "SMS automate", "Rapoarte lunare și asistență prioritară"],
    },
  ];
  for (const t of templates) {
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
