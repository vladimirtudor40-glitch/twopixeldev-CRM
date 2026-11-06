"""Transformă datele OSM brute în leaduri_litoral_alte_categorii.xlsx (aceleași coloane ca leaduri_litoral.xlsx + „Categorie lead”)."""
import json, re, sys, unicodedata, collections, urllib.parse
from datetime import date
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

raw, out = sys.argv[1], sys.argv[2]
elements = json.load(open(raw, encoding="utf-8"))["elements"]

def norm(s):
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()

BARBER_RE = re.compile(r"barber|barbier|frizer|gentlemen|men'?s|brbr")
def categorie_si_tip(t):
    shop, am, le, to, sp = (t.get(k, "") for k in ("shop", "amenity", "leisure", "tourism", "sport"))
    n = norm(t.get("name", ""))
    if shop == "hairdresser":
        if t.get("hairdresser") in ("barber", "men") or t.get("male") == "yes" or BARBER_RE.search(n):
            return "Barbershopuri", "Barbershop"
        return "Saloane beauty", "Salon coafura"
    if shop == "beauty":
        b = t.get("beauty", "")
        return "Saloane beauty", {"nails": "Salon unghii", "cosmetics": "Salon cosmetica"}.get(b, "Salon infrumusetare")
    if shop == "massage": return "Saloane beauty", "Masaj"
    if shop == "tattoo": return "Saloane beauty", "Tatuaje"
    if am == "spa" or le in ("spa", "sauna"): return "Saloane beauty", "Spa"
    resto = {"restaurant": "Restaurant", "cafe": "Cafenea", "bar": "Bar / Pub", "pub": "Bar / Pub",
             "biergarten": "Bar / Pub", "fast_food": "Fast food", "ice_cream": "Gelaterie"}
    if am in resto: return "Restaurante", resto[am]
    act = {("amenity", "nightclub"): "Club", ("amenity", "cinema"): "Cinema", ("amenity", "boat_rental"): "Inchiriere barci",
           ("amenity", "dive_centre"): "Scufundari", ("amenity", "casino"): "Cazino",
           ("leisure", "water_park"): "Aquapark", ("leisure", "amusement_arcade"): "Jocuri / distractie",
           ("leisure", "adult_gaming_centre"): "Jocuri / distractie", ("leisure", "escape_game"): "Escape room",
           ("leisure", "bowling_alley"): "Bowling", ("leisure", "miniature_golf"): "Minigolf",
           ("leisure", "trampoline_park"): "Trambuline", ("leisure", "horse_riding"): "Echitatie",
           ("leisure", "sports_centre"): "Centru sportiv", ("leisure", "fitness_centre"): "Sala fitness",
           ("leisure", "beach_resort"): "Beach club / plaja", ("leisure", "marina"): "Port turistic / marina",
           ("leisure", "dance"): "Scoala de dans", ("tourism", "theme_park"): "Parc de distractii",
           ("tourism", "zoo"): "Zoo", ("tourism", "aquarium"): "Acvariu", ("tourism", "gallery"): "Galerie"}
    for k, v in (("amenity", am), ("leisure", le), ("tourism", to)):
        if (k, v) in act: return "Activitati", act[(k, v)]
    sports = {"karting": "Karting", "paintball": "Paintball", "shooting": "Tir", "equestrian": "Echitatie",
              "horse_riding": "Echitatie", "scuba_diving": "Scufundari", "climbing": "Catarare",
              "surfing": "Sporturi nautice", "kitesurfing": "Sporturi nautice", "windsurfing": "Sporturi nautice",
              "water_ski": "Sporturi nautice", "wakeboarding": "Sporturi nautice", "bowling": "Bowling", "10pin": "Bowling"}
    for s in sp.split(";"):
        if s in sports: return "Activitati", sports[s]
    if to == "attraction" and not (t.get("religion") or t.get("historic") or t.get("amenity")) and any(t.get(k) for k in ("website", "contact:website", "phone", "contact:phone", "opening_hours", "fee", "facebook", "contact:facebook")):
        return "Activitati", "Atractie"
    return None, None

def zona(lat, lon, t):
    city = norm(t.get("addr:city", "") + " " + t.get("addr:place", ""))
    if lat >= 44.255:
        return "Mamaia Nord / Navodari" if lon >= 28.575 else "Alte localitati (in afara zonei)"
    if lat >= 44.205 and lon >= 28.60 and "constanta" not in city:
        return "Mamaia"
    if lat >= 44.10 and lon >= 28.555: return "Constanta"
    if lat >= 44.076 and lon >= 28.60: return "Agigea"
    if lat >= 44.040 and lon >= 28.615: return "Eforie Nord"
    if lat >= 44.012 and lon >= 28.630: return "Eforie Sud"
    return "Alte localitati (in afara zonei)"

PLATFORME = ("facebook.com", "fb.com", "fb.me", "instagram.com", "booking.com", "tripadvisor", "business.site",
             "linktr.ee", "glovo", "tazz.ro", "wolt.com", "foodpanda", "bolt.eu", "mero.ro", "booksy", "fresha",
             "treatwell", "google.com", "goo.gl", "g.page", "tiktok.com", "youtube.com", "wa.me", "whatsapp",
             "tinyurl", "bit.ly", "foursquare", "yelp", "restaurantguru", "zomato", "travelminit", "infoturism", "turistinfo")
def e_platforma(u): return any(p in u.lower() for p in PLATFORME)
def url(u):
    u = u.strip()
    if not u: return ""
    if not re.match(r"https?://", u): u = "https://" + u
    return u

def telefon(t):
    v = t.get("phone") or t.get("contact:phone") or t.get("contact:mobile") or t.get("mobile") or ""
    return "; ".join(x.strip() for x in v.split(";") if x.strip())

GENERICE = {"frizerie", "frizerie coafare", "coafor", "coafura", "salon", "restaurant", "bar", "cafenea", "bistro",
            "pizzerie", "fast food", "terasa", "club", "beach bar", "plaja", "sala de sport", "fitness", "noi"}
rows, seen = [], {}
for e in elements:
    t = e.get("tags", {})
    name = (t.get("name") or "").strip()
    if not name or t.get("brand:wikidata") or t.get("disused") or t.get("abandoned"): continue
    cat, tip = categorie_si_tip(t)
    if not cat: continue
    lat = e.get("lat") or e.get("center", {}).get("lat"); lon = e.get("lon") or e.get("center", {}).get("lon")
    if lat is None: continue
    z = zona(lat, lon, t)
    links = []
    for k in ("website", "contact:website", "url", "facebook", "contact:facebook", "instagram", "contact:instagram", "contact:tripadvisor"):
        for v in (t.get(k) or "").split(";"):
            v = v.strip()
            if not v: continue
            if k.endswith("facebook") and not v.startswith("http") and "facebook" not in v: v = "facebook.com/" + v
            if k.endswith("instagram") and not v.startswith("http") and "instagram" not in v: v = "instagram.com/" + v.lstrip("@")
            v = url(v)
            if v not in links: links.append(v)
    proprii = [u for u in links if not e_platforma(u)]
    platf = [u for u in links if e_platforma(u)]
    tel = telefon(t)
    if proprii:
        status, prio, verif = "Are site propriu", "C", "Nu (verifica daca site-ul are rezervare directa)"
    elif platf:
        status, prio, verif = "Doar Booking / Facebook / platforme", "A", "Da, confirma pe Google Maps"
    else:
        status, verif = "Fara site in OpenStreetMap", "Da, cauta pe Google Maps"
        prio = "A" if tel else "B"
    strada = " ".join(x for x in (t.get("addr:street", ""), t.get("addr:housenumber", "")) if x)
    adresa = ", ".join(x for x in (strada, t.get("addr:city", "")) if x)
    zona_q = z if not z.startswith("Alte") else (t.get("addr:city") or "Constanta")
    generic = norm(name) in GENERICE or len(norm(name)) < 4
    q = f"{lat:.6f},{lon:.6f}" if generic else f"{name} {zona_q}"  # nume generic -> căutăm după coordonate
    gmaps = "https://www.google.com/maps/search/?api=1&query=" + urllib.parse.quote_plus(q)
    osm = f"https://www.openstreetmap.org/{e['type']}/{e['id']}"
    row = dict(Prioritate=prio, Categorie=cat, Nume=name, Tip=tip, Zona=z, Adresa=adresa, Telefon=tel,
               Email=t.get("email") or t.get("contact:email") or "", Status=status, Site=proprii[0] if proprii else "",
               Alte="; ".join(proprii[1:] + platf), Verif=verif, Gmaps=gmaps, Osm=osm, Lat=round(lat, 6), Lon=round(lon, 6))
    key = (norm(name), z)
    if key in seen:  # același local cartografiat de două ori (punct + clădire): păstrăm varianta mai completă
        old = seen[key]
        if sum(bool(v) for v in row.values()) > sum(bool(v) for v in old.values()): old.update(row)
        continue
    seen[key] = row; rows.append(row)

ORD_P = {"A": 0, "B": 1, "C": 2}
ORD_C = ["Barbershopuri", "Restaurante", "Activitati", "Saloane beauty"]
rows.sort(key=lambda r: (ORD_C.index(r["Categorie"]), ORD_P[r["Prioritate"]], r["Zona"].startswith("Alte"), r["Zona"], norm(r["Nume"])))
AFIS = {"Activitati": "Activități"}

wb = Workbook(); s = wb.active; s.title = "Sumar"
s["A1"] = f"Leaduri litoral - alte categorii (barbershopuri, restaurante, activitati, saloane beauty) - generat {date.today().isoformat()}"
s["A1"].font = Font(bold=True, size=13)
hdr = ["Categorie lead", "Zona", "Total", "A: fara site, cu telefon / doar platforme", "B: de verificat", "C: au site"]
s.append([]); s.append(hdr)
for c in s[3]: c.font = Font(bold=True)
cnt = collections.Counter((r["Categorie"], r["Zona"], r["Prioritate"]) for r in rows)
for cat in ORD_C:
    zs = sorted({r["Zona"] for r in rows if r["Categorie"] == cat})
    for z in zs:
        a, b, c = (cnt[(cat, z, p)] for p in "ABC")
        s.append([AFIS.get(cat, cat), z, a + b + c, a, b, c])
    a, b, c = (sum(cnt[(cat, z, p)] for z in zs) for p in "ABC")
    s.append([f"Total {AFIS.get(cat, cat)}", "", a + b + c, a, b, c])
    for cell in s[s.max_row]: cell.font = Font(bold=True)
a, b, c = (sum(1 for r in rows if r["Prioritate"] == p) for p in "ABC")
s.append(["TOTAL", "", a + b + c, a, b, c])
for cell in s[s.max_row]: cell.font = Font(bold=True)
for line in ["", "Legenda:",
             "A = nu are site propriu in date si are telefon, sau are doar Facebook / Instagram / platforme (Glovo, Tazz, Mero, Booksy etc.) -> sunati primii",
             "B = fara site si fara telefon in date -> cautati pe Google Maps (link in tabel)",
             "C = au deja site; verificati daca au rezervare / programare online (pot fi tot clienti)",
             "Sursa: doar OpenStreetMap (ODbL). Lanturile mari (McDonald's, KFC, Starbucks etc.) au fost excluse. OSM nu e complet, mai ales la frizerii si saloane: confirmati pe Google Maps inainte de contact.",
             "Coloana 'Categorie lead' spune in ce categorie din CRM intra fiecare rand."]:
    s.append([line])
for col, w in zip("ABCDEF", (20, 32, 8, 38, 16, 12)): s.column_dimensions[col].width = w

L = wb.create_sheet("Leaduri")
cols = ["Prioritate", "Nume", "Tip", "Zona", "Adresa", "Telefon", "Email", "Status site", "Site propriu",
        "Booking / Facebook / alte linkuri", "Verificare manuala", "Cauta pe Google Maps", "Stele (OSM)",
        "Categorie (minister)", "Camere / locuri", "In lista ministerului", "Operator (minister)", "Sursa",
        "Link OSM", "Lat", "Lon", "Categorie lead"]
L.append(cols)
for c in L[1]: c.font = Font(bold=True, color="FFFFFF"); c.fill = PatternFill("solid", fgColor="0A1828")
link_font = Font(color="0563C1", underline="single")
for r in rows:
    L.append([r["Prioritate"], r["Nume"], r["Tip"], r["Zona"], r["Adresa"], r["Telefon"] or None, r["Email"] or None,
              r["Status"], r["Site"] or None, r["Alte"] or None, r["Verif"], "Deschide", None, None, None, None, None,
              "OpenStreetMap", "Deschide", r["Lat"], r["Lon"], AFIS.get(r["Categorie"], r["Categorie"])])
    i = L.max_row
    L.cell(i, 12).hyperlink = r["Gmaps"]; L.cell(i, 12).font = link_font
    L.cell(i, 19).hyperlink = r["Osm"]; L.cell(i, 19).font = link_font
L.freeze_panes = "C2"; L.auto_filter.ref = L.dimensions
for i, w in enumerate([10, 34, 20, 26, 36, 18, 26, 32, 34, 40, 34, 14, 8, 10, 10, 10, 12, 14, 10, 11, 11, 16], 1):
    L.column_dimensions[get_column_letter(i)].width = w
wb.save(out)
print(len(rows), "randuri")
print(collections.Counter((r["Categorie"], r["Prioritate"]) for r in rows))
print(collections.Counter((r["Categorie"], r["Tip"]) for r in rows).most_common())
print(collections.Counter(r["Zona"] for r in rows))
