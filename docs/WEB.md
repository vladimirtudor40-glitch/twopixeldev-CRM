# CRM-ul în site (twopixeldev.com/app/ → Clienți)

Același cod ca programul de Windows, construit cu `CRM_MODE=web` și pus pe Cloudflare Workers (OpenNext).
Programul de Windows nu se schimbă: fără `CRM_MODE=web` totul merge ca înainte.

## Cum funcționează

```
browser ──► Worker „twopixeldev” (site) ──► Worker „twopixeldev-crm” (acest repo) ──► Supabase
             verifică login-ul site-ului       fără adresă publică
             /app/crm/* → legătura CRM          primește x-tpd-user + x-tpd-proxy
```

- **Un singur login, al site-ului.** Worker-ul site-ului trimite mai departe doar cererile utilizatorilor
  logați, cu emailul contului (`x-tpd-user`) și secretul comun `CRM_PROXY_SECRET` (`x-tpd-proxy`).
  Fără secretul corect CRM-ul răspunde 401; API-ul Auth.js și pagina /login nu există în versiunea web.
- **Worker-ul CRM nu are adresă publică** (`workers_dev: false`): ajungi la el doar prin site.
- **Conturi:** prima intrare a unui cont din site îi creează contul în CRM, ca ADMIN (în site intră doar
  proprietarii). Dacă emailul din site diferă de cel din CRM, leagă-le cu secretul opțional
  `CRM_USER_MAP` = `{"email-site":"email-crm"}`.
- **Tema** e cea din /app/: `data-skin="site"` (variabilele din `src/app/globals.css`), iar dark/light
  urmează butonul din site (cheia `tpd-theme`, schimbată live).
- **Baza de date:** aceeași bază Supabase ca programul. Fiecare cerere își deschide conexiunea
  (vezi `src/lib/prisma.ts`); cu Hyperdrive conexiunile rămân calde și paginile sunt mai rapide.

## Prima publicare (o singură dată)

Nevoie: **Cloudflare Workers Paid (5 $/lună)**. Pe planul gratuit un Worker are 10 ms de procesor pe cerere,
prea puțin pentru paginile Next.js ale CRM-ului.

1. Un secret comun, aleator (păstrează-l doar în Cloudflare):
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
2. În acest repo:
   ```
   npm ci
   npx wrangler login
   npx wrangler secret put DATABASE_URL       # Supabase → Connect → Session pooler (port 5432), cu parola
   npx wrangler secret put CRM_PROXY_SECRET   # secretul de la pasul 1
   npx wrangler secret put AUTH_SECRET        # orice șir aleator (ca la pasul 1)
   npm run web:deploy
   ```
   Prima comandă `secret put` poate întreba dacă să creeze Worker-ul „twopixeldev-crm”: da.
3. În repo-ul site-ului (twopixeldev):
   ```
   npx wrangler secret put CRM_PROXY_SECRET   # același secret
   npm run deploy
   ```

### Opțional: Hyperdrive (mai rapid)

```
npx wrangler hyperdrive create twopixeldev-crm-db --connection-string="<Session pooler URL>"
```
și adaugă în `wrangler.jsonc`: `"hyperdrive": [{ "binding": "HYPERDRIVE", "id": "<id-ul primit>" }]`, apoi `npm run web:deploy`.

## Actualizări

`npm run web:deploy` aici (CRM), `npm run deploy` în site. Ordinea contează doar la prima publicare.

## Test local

```
# .dev.vars (nu intră în git): DATABASE_URL, CRM_PROXY_SECRET, AUTH_SECRET
npm run web:build && npx wrangler dev --port 8788
# în repo-ul site-ului, cu același CRM_PROXY_SECRET în .dev.vars:
npm run build && npx wrangler dev --port 8787     # legătura CRM apare „connected”
```
