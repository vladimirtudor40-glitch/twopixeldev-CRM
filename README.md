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

## Programul de Windows

CRM-ul se instalează pe laptop ca program obișnuit (`twopixeldev-CRM-Setup-<versiune>.exe`). Datele stau online, în Supabase, așa că mai multe laptopuri și mai mulți colegi lucrează pe aceeași bază. Programul are nevoie de internet.

### De unde iei installer-ul

- La fiecare push pe `main` sau `desktop-windows`, GitHub Actions construiește installer-ul pe Windows și îl publică în **Releases** ca `v<versiune>` (versiunea din `package.json`). Ultima versiune: pagina **Releases** a repo-ului.
- Programul instalat verifică singur Releases la pornire și la fiecare 4 ore, descarcă versiunea nouă în fundal și te întreabă dacă repornește acum (sau o instalează când închizi programul). Manual: **Ajutor → Caută actualizări**.
- Ca să livrezi o actualizare, crești `version` în `package.json` și faci push. Fără creșterea versiunii, Release-ul existent nu se schimbă.
- Installer-ul nu e semnat digital, așa că Windows poate afișa „Windows a protejat computerul”. Apeși **Mai multe informații** → **Rulează oricum**.

### Prima pornire

1. În Supabase deschide proiectul, apasă **Connect** și alege **Session pooler**. Copiază adresa (URI), de forma `postgresql://postgres.<proiect>:[YOUR-PASSWORD]@aws-0-<regiune>.pooler.supabase.com:5432/postgres`.
   - Folosește „Session pooler”, nu „Direct connection”: conexiunea directă merge doar pe rețele IPv6 și pe multe rețele de acasă nu funcționează.
   - Parola e cea a bazei de date (Project Settings → Database), nu parola contului Supabase.
2. Lipește adresa în program, înlocuiește `[YOUR-PASSWORD]` cu parola și apasă **Verifică conexiunea**.
3. Dacă baza e goală, programul creează tabelele (cu extensiile `pg_trgm` și `unaccent`), contul tău de administrator și șabloanele de ofertă. Dacă baza există deja (de pe alt laptop), te autentifici direct cu contul tău.

Adresa bazei e păstrată criptată pe laptop (Windows DPAPI), în `%APPDATA%\twopixeldev CRM\config.json`. O schimbi din meniul **Fișier → Conexiunea la baza de date…**. Jurnalele serverului sunt în `%APPDATA%\twopixeldev CRM\jurnale`.

### Cum funcționează

- `desktop/src` conține procesul principal Electron: fereastra, meniul în română, ecranul de configurare și pornirea serverului.
- Aplicația Next.js e construită ca `standalone` și rulează local, doar pe `127.0.0.1`, pe un port liber, cu Node-ul inclus în Electron.
- La fiecare pornire, programul aplică singur migrările noi (`prisma/migrations`). Le înregistrează în `_prisma_migrations`, deci `prisma migrate deploy` rămâne compatibil. Un lacăt în baza de date împiedică două laptopuri să migreze în același timp.
- Linkurile externe (site-uri, Google Maps, WhatsApp, `tel:`, `mailto:`) se deschid în browserul și programele laptopului.
- O versiune nouă se instalează peste cea veche; setările și sesiunea rămân.

```bash
npm run build && npm run desktop:start   # rulează programul din repo (fără installer)
npm run desktop:dist                     # construiește installer-ul .exe (pe Windows)
```

### Varianta web (opțional)

Aceeași aplicație poate rula și pe Vercel, pe aceeași bază Supabase: setezi `DATABASE_URL`, `DIRECT_URL` și `AUTH_SECRET` (`openssl rand -base64 32`), iar tabelele le creează programul de Windows sau `npx prisma migrate deploy`.

## Verificări

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
