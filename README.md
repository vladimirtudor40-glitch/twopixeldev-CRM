# twopixeldev CRM

Unealta internă de vânzări twopixeldev: evidența unităților de cazare de pe litoral (Constanța, Mamaia, Mamaia Nord / Năvodari, Eforie Nord, Eforie Sud, Agigea), de la prima găsire până devin clienți plătitori.

- Arhitectura: [docs/ARHITECTURA.md](docs/ARHITECTURA.md)
- Schema bazei de date: [prisma/schema.prisma](prisma/schema.prisma)
- Prototipul interactiv din Pasul 1 (date demo): [docs/prototip.html](docs/prototip.html)

Stack: Next.js 15 (App Router), TypeScript strict, Tailwind, Prisma 6 + PostgreSQL (`pg_trgm`, `unaccent`), Auth.js v5.

## Ce funcționează acum (Pasul 2)

- **Login** cu email și parolă, roluri `ADMIN` și `AGENT_VANZARI`.
- **Import Excel / CSV** (`/import`), doar pentru admin. Coloanele exportului `gaseste_leaduri.py` sunt recunoscute automat, inclusiv linkurile ascunse sub „Deschide”. Pașii: încarci fișierul, verifici maparea și previzualizarea, apoi apeși „Importă”.
  - Deduplicarea se face, în ordine, după ID-ul OpenStreetMap, nume normalizat + zonă + telefon, nume + zonă (dacă lipsește telefonul) și telefon în aceeași zonă. Rândurile duplicate din același fișier se unesc.
  - La re-import se completează **doar câmpurile goale**. Ce ai scris de mână, etapa, responsabilul, notițele și opt-out-ul nu se schimbă.
  - Fiecare rând rămâne în istoricul importului, cu ce s-a întâmplat cu el.
- **Lead-uri** (`/leaduri`):
  - Căutarea merge fără diacritice și găsește și numere de telefon scrise cu spații.
  - Filtrele se pot combina: zonă, prioritate, status site, etapă, tip, telefon, ultima interacțiune, responsabil, opt-out și arhivă. Se pot sorta și salva ca vederi.
  - Pe telefon lead-urile apar ca listă de carduri.
- **Fișa lead-ului** are:
  - butoanele Sună, WhatsApp, Email și Google Maps;
  - persoanele de contact (adaugi, editezi, ștergi);
  - opțiunea „Nu mai contacta”, preluarea unui lead fără responsabil și arhivarea;
  - istoricul modificărilor (audit) și importurile din care vine.
- **Panou** cu lead-urile A de sunat primele, totalurile pe zonă și prioritate și pe etape, plus ultimul import.

## Pornire locală

```bash
cp .env.example .env          # completează DATABASE_URL, DIRECT_URL, AUTH_SECRET, SEED_ADMIN_*
npm install
npx prisma migrate deploy     # creează tabelele + extensiile pg_trgm și unaccent
npm run db:seed               # primul utilizator ADMIN + șabloanele de ofertă
npm run dev                   # http://localhost:3000
```

Importul se poate rula și din linia de comandă, cu același cod ca în aplicație:

```bash
npm run import:cli -- cale/leaduri_litoral.xlsx
```

## Deploy (Vercel + Supabase)

1. Creează un proiect Supabase. Din **Connect**, copiază URL-ul „Transaction pooler” (portul 6543, cu `?pgbouncer=true`) în `DATABASE_URL` și URL-ul „Direct connection” (portul 5432) în `DIRECT_URL`.
2. În Vercel, importă repo-ul și setează `DATABASE_URL`, `DIRECT_URL` și `AUTH_SECRET` (`openssl rand -base64 32`).
3. Rulează o dată, local, cu variabilele de producție: `npx prisma migrate deploy` și `npm run db:seed`.

## Verificări

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
