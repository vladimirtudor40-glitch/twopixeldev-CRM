# CRM-ul în site (twopixeldev.com/app/ → Clienți)

Același cod ca programul de Windows, construit cu `CRM_MODE=web` și găzduit **gratuit pe Netlify**.
Programul de Windows nu se schimbă: fără `CRM_MODE=web` totul merge ca înainte.

## Cum funcționează

```
browser ──► Worker „twopixeldev” (site, Cloudflare) ──► CRM pe Netlify ──► Supabase
             verifică login-ul site-ului                 răspunde doar cu secretul corect
             /app/crm/* → CRM_ORIGIN                      (x-tpd-user + x-tpd-proxy)
```

- **Un singur login, al site-ului.** Worker-ul site-ului trimite mai departe doar cererile utilizatorilor
  logați, cu emailul contului (`x-tpd-user`) și secretul comun `CRM_PROXY_SECRET` (`x-tpd-proxy`).
  Adresa Netlify e publică, dar fără secret nu arată nimic (401). În versiunea web nu există
  API-ul Auth.js și nici pagina /login.
- **Conturi:** prima intrare a unui cont din site îi creează contul în CRM, ca ADMIN (în site intră doar
  proprietarii). Dacă emailul din site diferă de cel din CRM, leagă-le cu variabila opțională
  `CRM_USER_MAP` = `{"email-site":"email-crm"}`.
- **Tema** e cea din /app/: `data-skin="site"` (variabilele din `src/app/globals.css`), iar dark/light
  urmează butonul din site (cheia `tpd-theme`, schimbată live).
- **Baza de date:** aceeași bază Supabase ca programul.

## Planul gratuit Netlify

300 de credite pe lună. Ce consumă CRM-ul:
- **o publicare (deploy) = 15 credite**, deci aproximativ 20 de publicări pe lună;
- folosirea efectivă de către 2–3 oameni: sub 1 credit pe lună (cereri + timp de server).

Dacă se termină creditele, Netlify oprește CRM-ul până luna următoare (trimite avertizări la 50%, 75%
și 100%). De aceea, la pasul 4 de mai jos dezactivezi publicările de probă.

## Prima configurare (o singură dată)

1. **Un secret comun**, aleator (îl pui doar în Netlify și în Cloudflare, nicăieri altundeva):
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
2. **Netlify:** intră pe https://app.netlify.com cu contul GitHub → *Add new project* → *Import an
   existing project* → GitHub → repo-ul **twopixeldev-CRM**, branch **desktop-windows**. Setările de build
   vin din `netlify.toml`, nu trebuie schimbate.
3. **Variabile** (*Project configuration → Environment variables*), înainte de primul deploy:
   - `DATABASE_URL`: Supabase → *Connect* → **Transaction pooler** (port 6543), cu parola, plus la final
     `?pgbouncer=true&connection_limit=1`
   - `CRM_PROXY_SECRET`: secretul de la pasul 1
   - `AUTH_SECRET`: alt șir aleator (aceeași comandă de la pasul 1)
   Apoi *Deploys → Trigger deploy*. Adresa proiectului (ex. `https://twopixeldev-crm.netlify.app`) o poți
   schimba din *Project configuration → Change project name*.
4. **Economisește credite:** *Project configuration → Build & deploy → Branches and deploy contexts*:
   **Deploy Previews: Don't deploy pull requests** și **Branch deploys: Deploy only the production branch**.
   Dacă la *Functions* poți alege regiunea, alege **Frankfurt (eu-central-1)**, lângă Supabase.
5. **Site (repo twopixeldev):**
   ```
   npx wrangler secret put CRM_ORIGIN         # adresa Netlify de la pasul 3, fără / la final
   npx wrangler secret put CRM_PROXY_SECRET   # același secret de la pasul 1
   npm run deploy
   ```

## Actualizări

Fiecare push / merge în `desktop-windows` publică automat CRM-ul web pe Netlify (15 credite).
Site-ul se publică în continuare cu `npm run deploy`.

## Test local

```
# .env (nu intră în git): DATABASE_URL, CRM_PROXY_SECRET, AUTH_SECRET
npm run web:build && CRM_MODE=web npx next start -p 8790
# în repo-ul site-ului, în .dev.vars: CRM_ORIGIN=http://127.0.0.1:8790 + același CRM_PROXY_SECRET
npm run build && npx wrangler dev --port 8787
```
