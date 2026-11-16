import { describe, expect, it } from "vitest";
import { autoDetectColumnMap, mapRow, parseType, parseWebsiteStatus, parseZone } from "@/server/import/fields";
import { fillEmpty, planImport, type ExistingLead } from "@/server/import/plan";

const HEADERS = [
  "Prioritate", "Nume", "Tip", "Zona", "Adresa", "Telefon", "Email", "Status site", "Site propriu",
  "Booking / Facebook / alte linkuri", "Verificare manuala", "Cauta pe Google Maps", "Stele (OSM)",
  "Categorie (minister)", "Camere / locuri", "In lista ministerului", "Operator (minister)", "Sursa",
  "Link OSM", "Lat", "Lon",
];

const row = (o: Record<string, string>) => Object.fromEntries(HEADERS.map((h) => [h, o[h] ?? ""]));

describe("maparea coloanelor din scriptul gaseste_leaduri.py", () => {
  it("recunoaște automat toate coloanele exportului", () => {
    const map = autoDetectColumnMap(HEADERS);
    expect(map).toMatchObject({
      Prioritate: "priority", Nume: "name", Tip: "type", Zona: "zone", Adresa: "address", Telefon: "phone",
      Email: "email", "Status site": "websiteStatus", "Site propriu": "websiteUrl",
      "Booking / Facebook / alte linkuri": "platformLinks", "Verificare manuala": "manualCheckNote",
      "Cauta pe Google Maps": "googleMapsUrl", "Stele (OSM)": "starsOsm", "Categorie (minister)": "categoryMinistry",
      "Camere / locuri": "roomsPlaces", "In lista ministerului": "inMinistryList", "Operator (minister)": "operatorName",
      Sursa: "source", "Link OSM": "osmUrl", Lat: "latitude", Lon: "longitude",
    });
  });

  it("transformă textele în valori", () => {
    expect(parseZone("Mamaia Nord / Navodari")).toBe("MAMAIA_NORD_NAVODARI");
    expect(parseZone("Mamaia")).toBe("MAMAIA");
    expect(parseZone("Alte localitati (in afara zonei)")).toBe("ALTA");
    expect(parseType("Apartament / Regim hotelier")).toBe("APARTAMENT_REGIM_HOTELIER");
    expect(parseType("Pensiune / Vila")).toBe("PENSIUNE_VILA");
    expect(parseWebsiteStatus("Fara site in OpenStreetMap")).toBe("FARA_SITE");
    expect(parseWebsiteStatus("Doar Booking / Facebook / platforme")).toBe("DOAR_PLATFORME");
    expect(parseWebsiteStatus("Are site propriu")).toBe("ARE_SITE_PROPRIU");
  });

  it("mapează un rând complet", () => {
    const map = autoDetectColumnMap(HEADERS);
    const r = mapRow(row({
      Prioritate: "A", Nume: "Vila Tropicana", Tip: "Pensiune / Vila", Zona: "Eforie Nord", Telefon: "+40 722 123 456",
      "Status site": "Doar Booking / Facebook / platforme",
      "Booking / Facebook / alte linkuri": "https://www.booking.com/hotel/ro/vila-tropicana.ro.html | https://www.facebook.com/vilatropicana",
      "Camere / locuri": "12 / 30", Sursa: "OpenStreetMap", "Link OSM": "https://www.openstreetmap.org/node/42",
      Lat: "44.06", Lon: "28.63",
    }), map);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data).toMatchObject({
      name: "Vila Tropicana", nameNormalized: "tropicana", zone: "EFORIE_NORD", type: "PENSIUNE_VILA",
      priority: "A", phoneNormalized: "0722123456", websiteStatus: "DOAR_PLATFORME",
      bookingUrl: "https://www.booking.com/hotel/ro/vila-tropicana.ro.html", facebookUrl: "https://www.facebook.com/vilatropicana",
      roomsCount: 12, placesCount: 30, source: "OSM", osmId: "node/42", latitude: 44.06, longitude: 28.63,
    });
  });

  it("refuză rândurile fără nume", () => {
    expect(mapRow(row({ Zona: "Mamaia" }), autoDetectColumnMap(HEADERS)).ok).toBe(false);
  });
});

describe("fillEmpty", () => {
  it("completează doar câmpurile goale", () => {
    const { patch, fields } = fillEmpty(
      { email: "manual@vila.ro", phoneNormalized: null, websiteStatus: "NECUNOSCUT", address: "Str. Mării 1" },
      { email: "alt@vila.ro", phone: "0722 123 456", phoneNormalized: "0722123456", websiteStatus: "FARA_SITE", address: "Alta" },
    );
    expect(patch).toEqual({ phoneNormalized: "0722123456", phone: "0722 123 456", websiteStatus: "FARA_SITE" });
    expect(fields).toEqual(["phoneNormalized", "websiteStatus"]);
  });
});

describe("planImport", () => {
  const map = autoDetectColumnMap(HEADERS);
  let n = 0;
  const newId = () => `nou${++n}`;

  it("creează, completează și recunoaște duplicatele", () => {
    const existing: ExistingLead[] = [
      { id: "L1", osmId: "node/1", category: "HOTELURI", nameNormalized: "maria", zone: "EFORIE_NORD", phoneNormalized: null, values: { email: "x@y.ro" } },
      { id: "L2", osmId: null, category: "HOTELURI", nameNormalized: "ciresica", zone: "MAMAIA", phoneNormalized: "0341103874", values: { address: "Str. 1", phoneNormalized: "0341103874" } },
    ];
    const plan = planImport({
      columnMap: map, existing, newId,
      rows: [
        // același OSM, aduce telefon -> completează
        { rowNumber: 2, raw: row({ Nume: "Vila Maria", Zona: "Eforie Nord", Telefon: "0722000001", "Link OSM": "https://www.openstreetmap.org/node/1" }) },
        // nume + zonă + telefon, nimic nou
        { rowNumber: 3, raw: row({ Nume: "Hotel Cireșica", Zona: "Mamaia", Telefon: "+40 341 103 874", Adresa: "Altă adresă" }) },
        // nou
        { rowNumber: 4, raw: row({ Nume: "Vila Zara", Zona: "Eforie Sud", "Link OSM": "https://www.openstreetmap.org/node/7" }) },
        // duplicat în fișier al rândului 4 (același OSM), aduce email
        { rowNumber: 5, raw: row({ Nume: "Vila Zara", Zona: "Eforie Sud", Email: "zara@vila.ro", "Link OSM": "https://www.openstreetmap.org/node/7" }) },
        // același nume generic, alt OSM -> lead separat
        { rowNumber: 6, raw: row({ Nume: "Vila Zara", Zona: "Eforie Sud", "Link OSM": "https://www.openstreetmap.org/node/8" }) },
        // fără nume -> eroare
        { rowNumber: 7, raw: row({ Zona: "Mamaia" }) },
        // exclus manual
        { rowNumber: 8, raw: row({ Nume: "Hotel X", Zona: "Mamaia" }), excluded: true },
      ],
    });
    const byRow = Object.fromEntries(plan.rows.map((r) => [r.rowNumber, r]));
    expect(byRow[2]).toMatchObject({ action: "ACTUALIZAT", leadId: "L1", matchedBy: "ID OpenStreetMap", updatedFields: ["phoneNormalized", "osmId"] });
    expect(byRow[3]).toMatchObject({ action: "NESCHIMBAT", leadId: "L2", matchedBy: "nume+zonă+telefon" });
    expect(byRow[4]?.action).toBe("CREAT");
    expect(byRow[5]).toMatchObject({ action: "ACTUALIZAT", leadId: byRow[4]?.leadId, mergedIntoRow: 4, updatedFields: ["email"] });
    expect(byRow[6]?.action).toBe("CREAT");
    expect(byRow[6]?.leadId).not.toBe(byRow[4]?.leadId);
    expect(byRow[7]?.action).toBe("EROARE");
    expect(byRow[8]?.action).toBe("IGNORAT");
    expect(plan.summary).toEqual({ total: 7, create: 2, update: 2, unchanged: 1, skipped: 1, error: 1 });
    // emailul din rândul 5 ajunge în lead-ul creat din rândul 4
    expect(plan.creates.get(byRow[4]!.leadId!)?.email).toBe("zara@vila.ro");
    // lead-ul existent nu pierde emailul completat manual
    expect(plan.updates.get("L1")).not.toHaveProperty("email");
  });

  it("al doilea import al aceluiași fișier nu mai creează nimic", () => {
    const rows = [
      { rowNumber: 2, raw: row({ Nume: "Vila Nouă", Zona: "Agigea", Telefon: "0722000002" }) },
      { rowNumber: 3, raw: row({ Nume: "Hostel Far", Zona: "Constanta" }) },
    ];
    const first = planImport({ columnMap: map, existing: [], newId, rows });
    const existing: ExistingLead[] = [...first.creates.entries()].map(([id, d]) => ({
      id, osmId: d.osmId ?? null, category: d.category, nameNormalized: d.nameNormalized, zone: d.zone, phoneNormalized: d.phoneNormalized ?? null, values: { ...d },
    }));
    const second = planImport({ columnMap: map, existing, newId, rows });
    expect(second.summary).toMatchObject({ create: 0, update: 0, unchanged: 2 });
  });

  it("„Categorie lead” pune lead-ul în categoria lui, păstrează tipul liber și nu-l unește cu hotelul omonim", () => {
    const headers = [...HEADERS, "Categorie lead"];
    const m = autoDetectColumnMap(headers);
    expect(m["Categorie lead"]).toBe("category");
    expect(m["Categorie (minister)"]).toBe("categoryMinistry");
    const existing: ExistingLead[] = [
      { id: "H1", osmId: null, category: "HOTELURI", nameNormalized: "dobrogea", zone: "MAMAIA", phoneNormalized: "0722000003", values: {} },
    ];
    const plan = planImport({
      columnMap: m, existing, newId,
      rows: [
        { rowNumber: 2, raw: { ...row({ Nume: "Hotel Dobrogea", Zona: "Mamaia", Telefon: "0722000003", Tip: "Restaurant" }), "Categorie lead": "Restaurante" } },
        { rowNumber: 3, raw: { ...row({ Nume: "Fresh Cut", Zona: "Constanta", Tip: "Barbershop" }), "Categorie lead": "Barbershopuri" } },
        { rowNumber: 4, raw: { ...row({ Nume: "Studio Bella", Zona: "Constanta", Tip: "Salon infrumusetare" }), "Categorie lead": "Saloane beauty" } },
        { rowNumber: 5, raw: { ...row({ Nume: "Aqua Magic", Zona: "Mamaia", Tip: "Aquapark" }), "Categorie lead": "Activități" } },
        { rowNumber: 6, raw: { ...row({ Nume: "Vila Nouă", Zona: "Agigea", Tip: "Pensiune" }), "Categorie lead": "" } },
      ],
    });
    const created = plan.rows.map((r) => plan.creates.get(r.leadId ?? ""));
    expect(plan.summary.create).toBe(5);
    expect(created.map((d) => d?.category)).toEqual(["RESTAURANTE", "BARBERSHOPURI", "SALOANE_BEAUTY", "ACTIVITATI", "HOTELURI"]);
    expect(created[0]).toMatchObject({ businessType: "Restaurant" });
    expect(created[0]).not.toHaveProperty("type");
    expect(created[4]).toMatchObject({ type: "PENSIUNE_VILA" });
    expect(created[4]).not.toHaveProperty("businessType");
  });
});
