# twopixeldev CRM — Arhitectură (Pasul 1)

Unealta internă de vânzări twopixeldev: evidența unităților de cazare de pe litoral, de la prima găsire până devin clienți plătitori. Același stack ca platforma de rezervări, ca un client din CRM să poată fi legat de un `Tenant` prin `tenantSlug`.

## 1. Stack

| Strat | Alegere |
|---|---|
| Framework | Next.js 15 (App Router, Server Components, Server Actions), TypeScript `strict` |
| UI | Tailwind CSS, shadcn/ui, lucide-react, Framer Motion (doar micro-animații) |
| Formulare | react-hook-form + zod (aceleași scheme zod validează și în Server Actions) |
| Tabele | TanStack Table v8 (paginare pe server, coloane configurabile) |
| Kanban | @dnd-kit/core + @dnd-kit/sortable (funcționează și cu touch) |
| Hartă | Leaflet + react-leaflet, tile-uri OpenStreetMap, `leaflet.markercluster` |
| Date | PostgreSQL (Supabase sau Neon, plan gratuit) + Prisma 6, extensii `pg_trgm` și `unaccent` |
| Auth | Auth.js (NextAuth v5) cu `@auth/prisma-adapter`; login email + parolă și opțional Google |
| Import | SheetJS (`xlsx`) pentru .xlsx, `papaparse` pentru .csv, procesare pe server |
| PDF | `@react-pdf/renderer` pentru oferte |
| Grafice | Recharts (dashboard) |
| Hosting | Vercel + Supabase/Neon; Sentry pentru erori |

**Design:** dark mode, paleta twopixeldev: albastru închis clasic `#0A1828` (fundal), turcoaz `#178582` (acțiuni, stări active), auriu `#BFA181` (accente, „Câștigat”, MRR). Logo-ul metalic `twopixeldev` în bara laterală. Interfața e complet în română. E gândită mobile-first pentru lucrul pe teren: pe telefon, bara laterală devine navigație jos, iar butoanele „Sună / WhatsApp / Maps” sunt mari.

## 2. Structura repo-ului

```
twopixeldev-crm/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts                    # utilizator ADMIN, șabloane de ofertă, etichete, date demo
├─ public/brand/                 # logo, favicon
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ (app)/layout.tsx         # shell: sidebar / bottom-nav, căutare globală (Ctrl+K)
│  │  ├─ (app)/page.tsx           # Dashboard
│  │  ├─ (app)/leaduri/page.tsx              # tabel + filtre + vederi salvate
│  │  ├─ (app)/leaduri/nou/page.tsx
│  │  ├─ (app)/leaduri/[id]/page.tsx         # fișa lead-ului (tab-uri)
│  │  ├─ (app)/leaduri/[id]/oferta/nou/page.tsx
│  │  ├─ (app)/pipeline/page.tsx             # Kanban
│  │  ├─ (app)/harta/page.tsx
│  │  ├─ (app)/sarcini/page.tsx              # De făcut azi / Întârziate / Viitoare
│  │  ├─ (app)/oferte/page.tsx
│  │  ├─ (app)/oferte/[id]/page.tsx
│  │  ├─ (app)/clienti/page.tsx
│  │  ├─ (app)/clienti/[id]/page.tsx         # fișă client, implementare, încasări
│  │  ├─ (app)/incasari/page.tsx             # abonamente lunare, plătit / neplătit
│  │  ├─ (app)/import/page.tsx               # încărcare fișier
│  │  ├─ (app)/import/[batchId]/page.tsx     # mapare, previzualizare, rezultat
│  │  ├─ (app)/setari/{utilizatori,sabloane,etichete,audit}/page.tsx   # doar ADMIN
│  │  ├─ api/auth/[...nextauth]/route.ts
│  │  ├─ api/oferte/[id]/pdf/route.ts        # generează PDF-ul ofertei
│  │  ├─ api/export/route.ts                 # export Excel al vederii curente (Pasul 5)
│  │  └─ api/cron/reamintiri/route.ts        # Vercel Cron: sarcini scadente, abonamente restante
│  ├─ components/
│  │  ├─ ui/                     # shadcn/ui
│  │  ├─ layout/                 # Sidebar, BottomNav, CommandSearch
│  │  ├─ leads/                  # LeadTable, LeadFilters, LeadForm, QuickActions, StageBadge
│  │  ├─ pipeline/               # KanbanBoard, KanbanColumn, LeadCard, MoveStageDialog
│  │  ├─ map/                    # LeadMap (dynamic import, ssr:false)
│  │  ├─ interactions/           # Timeline, LogInteractionForm
│  │  ├─ tasks/                  # TaskList, TaskForm
│  │  ├─ offers/                 # SavingsCalculator, OfferForm, OfferPdf
│  │  ├─ clients/                # ClientCard, ImplementationChecklist, PaymentsTable
│  │  └─ dashboard/              # KpiTiles, Funnel, ActivityChart, TodayTasks
│  ├─ server/
│  │  ├─ db.ts                   # PrismaClient singleton
│  │  ├─ auth.ts                 # config Auth.js, roluri în sesiune
│  │  ├─ permissions.ts          # canEditLead(user, lead), requireAdmin() ...
│  │  ├─ audit.ts                # withAudit(): scrie AuditLog cu diff-ul
│  │  ├─ actions/                # Server Actions: leads, contacts, interactions, tasks,
│  │  │                          #   pipeline, offers, clients, payments, import, views
│  │  ├─ queries/                # citiri tipizate: leadList(filters), dashboardStats() ...
│  │  └─ import/                 # parse.ts, mapColumns.ts, normalize.ts, dedupe.ts, run.ts
│  ├─ lib/
│  │  ├─ normalize.ts            # stripDiacritics, normalizeName, normalizePhone
│  │  ├─ savings.ts              # calculatorul de economii (funcție pură, testată)
│  │  ├─ labels.ts               # etichete în română pentru toate enum-urile
│  │  ├─ links.ts                # tel:, wa.me, mailto:, Google Maps
│  │  └─ validators/             # scheme zod comune client + server
│  └─ middleware.ts              # protejează rutele (app)
├─ tests/                        # vitest: normalize, dedupe, savings, permissions
└─ .env.example                  # DATABASE_URL, DIRECT_URL, AUTH_SECRET, ...
```

## 3. Module

**Lead-uri.** Tabelul are paginare pe server, iar filtrele stau în URL (`?zona=MAMAIA&prioritate=A&etapa=CONTACTAT`), deci orice vedere se poate trimite ca link. Vederile salvate țin filtrele în `SavedView.filters`. Căutarea normalizează textul introdus (`unaccent(lower())`) și caută cu `%` și similaritate trigram pe `searchText`. Astfel „pensiunea stefania” găsește „Pensiunea Ștefănia”, iar „0722 123” găsește telefonul.

**Fișa lead-ului.** Antetul arată numele, etapa, prioritatea și responsabilul, plus acțiunile rapide: Sună (`tel:`), WhatsApp (`https://wa.me/40…`), Email (`mailto:`) și Google Maps. Tab-uri: Prezentare (date, linkuri, operator), Contacte, Istoric (interacțiuni și mutări de etapă, într-o singură cronologie), Sarcini, Oferte.

**Pipeline.** Kanban cu 10 coloane. Mutarea unui card cheamă Server Action-ul `moveLeadStage(leadId, toStage, {lostReason, followUpAt})`. Acesta scrie `PipelineStageChange` și `AuditLog` într-o singură tranzacție. Pentru „Pierdut” se cere motivul, iar pentru „Revino mai târziu” se cere data, care creează automat o sarcină la acea dată. Pe telefon, cardurile se mută și din meniul „Mută în…”.

**Hartă.** Marcaje colorate după etapă și clustere la zoom mic, cu aceleași filtre ca tabelul. Popup-ul are acțiunile rapide și „Adaugă în traseu”. Traseul e o listă ordonată, cu link de navigație Google Maps cu waypoint-uri, pentru vizite pe teren.

**Interacțiuni și sarcini.** Când salvezi o interacțiune, poți crea o sarcină din rezultat, de exemplu „cere revenire → sună vineri”. `Lead.lastInteractionAt` și `Lead.nextTaskAt` sunt denormalizate, pentru filtre și sortări rapide. Pagina Sarcini are trei liste: Întârziate, Azi și Viitoare.

**Oferte.** Oferta se completează dintr-un șablon (Esențial, Standard, Premium), cu prețurile modificabile. Calculatorul de economii e o funcție pură în `lib/savings.ts`:

```
încasări prin Booking     = încasări anuale × % prin Booking
comision evitat / an      = încasări prin Booking × % mutat pe direct × comision Booking
costul nostru anul 1      = setup + 12 × abonament
beneficiu net anul 1      = comision evitat − costul anul 1
recuperare investiție     = setup / (comision evitat / 12 − abonament)  [luni]
```

Rezultatele se salvează pe ofertă, deci un PDF trimis rămâne neschimbat. PDF-ul (`@react-pdf/renderer`) are logo, pachet, prețuri, calculul de economii și argumentele de vânzare.

**Clienți.** Butonul „Transformă în client” apare la etapa Câștigat sau la acceptarea unei oferte. Creează `Client`, `Subscription` și plata de setup, cu planul, prețurile, domeniul și `tenantSlug`. Checklist-ul de implementare are patru pași: site, motor de rezervări, iCal și plăți.

**Încasări.** Cron-ul lunar generează `Payment` (ABONAMENT) pentru fiecare abonament activ, cu `@@unique([subscriptionId, periodMonth])`, ca să nu existe dubluri. Plățile se marchează plătit sau neplătit, iar restanțele apar pe dashboard. MRR = suma `monthlyFee` pentru abonamentele `ACTIV`.

**Dashboard.** Arată lead-urile pe zonă și prioritate, funnel-ul (câte lead-uri au atins fiecare etapă, calculat din `PipelineStageChange`), activitatea pe săptămână (apeluri, demo-uri, oferte), MRR și restanțele, plus sarcinile de azi.

## 4. Import Excel / CSV și deduplicare

1. **Încărcare:** se încarcă `.xlsx` sau `.csv`. Pentru `.xlsx` se alege foaia, implicit „Leaduri”. Se creează `ImportBatch` cu statusul `PREVIZUALIZARE`.
2. **Mapare:** coloanele exportului `gaseste_leaduri.py` sunt recunoscute automat (Prioritate, Nume, Tip, Zona, Adresa, Telefon, Email, Status site, Site propriu, Booking, Facebook, alte linkuri, Verificare manuala, Cauta pe Google Maps, Stele (OSM), Categorie (minister), Camere / locuri, In lista ministerului, Operator (minister), Sursa, Link OSM, Lat, Lon). Orice coloană se poate remapa manual.
3. **Normalizare:** numele se trece în lowercase, fără diacritice, fără prefixele „pensiunea / vila / hotel”. Telefonul păstrează doar cifrele, iar `+40` devine `0`. Textele din fișier se transformă în valorile enum. De exemplu, „Mamaia Nord / Navodari” devine `MAMAIA_NORD_NAVODARI`, iar „Doar Booking / Facebook / platforme” devine `DOAR_PLATFORME`.
4. **Potrivire, în ordine:** `osmId`, apoi `nume + zonă + telefon`, apoi `nume + zonă` (dacă una dintre părți nu are telefon), apoi `telefon` (în aceeași zonă). Rândurile duplicate din același fișier se unesc între ele.
5. **Previzualizare:** pentru fiecare rând se arată ce se va întâmpla: Nou, Completează N câmpuri, Neschimbat sau Eroare. Se pot exclude rânduri înainte de import.
6. **Rulare:** în tranzacții de câte 200 de rânduri. La un lead existent se completează **doar câmpurile goale**, niciodată ce s-a scris manual. Etapa, responsabilul, notițele și opt-out-ul nu sunt atinse niciodată. Fiecare rând rămâne în `ImportRow` (`action`, `matchedBy`, `updatedFields`), ca să se vadă exact ce a făcut importul.

## 5. Roluri și securitate

| | ADMIN | AGENT_VANZARI |
|---|---|---|
| Vede toate lead-urile | da | da (filtru implicit „ale mele”) |
| Editează lead-uri, interacțiuni, sarcini | toate | ale sale și cele fără responsabil |
| Schimbă responsabilul | da | doar își asumă lead-uri libere |
| Import, export, ștergere, utilizatori, șabloane, audit | da | nu |
| Clienți și încasări | editează | doar citire |

- Fiecare Server Action verifică sesiunea și permisiunea în `server/permissions.ts`. Nu ne bazăm doar pe ascunderea butoanelor.
- `AuditLog` se scrie pentru creare, modificare (cu diff pe câmpuri), ștergere, schimbare de etapă, import, export și opt-out.
- **Opt-out „Nu mai contacta”:** lead-ul primește o bandă roșie, butoanele de contact sunt dezactivate, iar lead-ul e exclus din exporturi și campanii de email. Rămâne în bază, ca să nu fie re-importat ca lead nou. Datele sunt folosite doar pentru prospectare B2B.

## 6. Ordinea pașilor

1. **Acum:** arhitectura, `schema.prisma` (validată cu Prisma 6.16) și prototipul interactiv.
2. Import Excel/CSV cu deduplicare și CRUD real cu Server Actions.
3. Pipeline, interacțiuni, sarcini și reamintiri.
4. Oferte, calculator de economii și PDF, fișe client și abonamente.
5. Dashboard, roluri, audit, export și integrare ANAF.
