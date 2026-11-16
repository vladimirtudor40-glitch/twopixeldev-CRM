import { describe, expect, it } from "vitest";
import { autoDetectColumnMap, mapRow } from "@/server/import/fields";
import {
  describeLogLine, guessCategory, IMPORT_HEADERS, labelFromFileName, localityOf, parseEmails, parseGmapsCsv, resultFileName, siteKind, toImportRaw,
} from "@/server/lead-search/gmaps";

// Același format ca CSV-ul scris de google-maps-scraper (coloane prescurtate, ordinea lor reală).
const CSV = [
  "﻿input_id,link,title,category,address,website,phone,review_count,review_rating,latitude,longitude,place_id,emails",
  'a,https://www.google.com/maps/place/Jack%27s/data=1,Jack\'s Barber Shop,Frizerie,"Strada Poporului 205, 900178 Constanța",,0733 227 237,605,4.900000,44.179076,28.629763,ChIJ1,[]',
  'b,https://www.google.com/maps/place/Moto/data=2,Moto Barbershop,Frizerie,"str Dreptatii 1, 900395 Constanța",https://mero.ro/p/moto-barbershop,0730 971 974,10,5.000000,44.1,28.6,ChIJ2,"[""contact@moto.ro""]"',
  'c,https://www.google.com/maps/place/Fade/data=3,Fade O Clock,Frizerie,"Bulevardul Mamaia 113, Mamaia",https://fadeoclock.ro/,0758 116 646,0,0,44.2,28.6,ChIJ3,',
  ",,,,,,,,,,,,",
].join("\n");

describe("rezultatele Google Maps", () => {
  it("citește CSV-ul scraper-ului", () => {
    const p = parseGmapsCsv(CSV);
    expect(p).toHaveLength(3);
    expect(p[0]).toMatchObject({
      index: 0, title: "Jack's Barber Shop", category: "Frizerie", phone: "0733 227 237", siteKind: "none",
      rating: 4.9, reviews: 605, emails: [], latitude: 44.179076, placeId: "ChIJ1",
    });
    expect(p[1]).toMatchObject({ siteKind: "platform", emails: ["contact@moto.ro"] });
    expect(p[2]).toMatchObject({ siteKind: "own", rating: null });
  });

  it("stabilește zona după localitate, nu după numele străzii", () => {
    expect(localityOf('{"street":"Bulevardul Mamaia 113","city":"Constanța"}', "Bulevardul Mamaia 113, 900657 Constanța")).toBe("Constanța");
    expect(localityOf("", "Bulevardul Mamaia 113, 900657 Constanța")).toBe("Constanța");
    expect(localityOf("", "Strada Plopilor 2, 905700 Năvodari")).toBe("Năvodari");
    expect(localityOf('{"city":"Mamaia"}', "Aleea X, Mamaia")).toBe("Mamaia");
  });

  it("deosebește site-ul propriu de platforme", () => {
    expect(siteKind("")).toBe("none");
    expect(siteKind("https://mero.ro/p/x")).toBe("platform");
    expect(siteKind("https://www.facebook.com/x")).toBe("platform");
    expect(siteKind("m.facebook.com/x")).toBe("platform");
    expect(siteKind("http://downtownbarbershop.ro/")).toBe("own");
  });

  it("extrage emailurile", () => {
    expect(parseEmails('["a@b.ro","A@B.ro"]')).toEqual(["a@b.ro"]);
    expect(parseEmails("[]")).toEqual([]);
    expect(parseEmails("logo@2x.png x@y.com")).toEqual(["x@y.com"]);
  });

  it("transformă un rând în import CRM recunoscut automat", () => {
    const [jack, moto, fade] = parseGmapsCsv(CSV);
    const map = autoDetectColumnMap([...IMPORT_HEADERS]);
    expect(Object.values(map).filter((v) => !v)).toEqual([]);

    const a = mapRow(toImportRaw(jack!, "BARBERSHOPURI"), map);
    expect(a.ok && a.data).toMatchObject({
      name: "Jack's Barber Shop", category: "BARBERSHOPURI", businessType: "Frizerie", zone: "CONSTANTA",
      phoneNormalized: "0733227237", websiteStatus: "FARA_SITE", source: "GOOGLE_MAPS", ratingGoogle: 4.9,
      googleMapsUrl: "https://www.google.com/maps/place/Jack%27s/data=1", latitude: 44.179076,
    });
    expect(a.ok && a.data.type).toBeUndefined();

    const b = mapRow(toImportRaw(moto!, "BARBERSHOPURI"), map);
    expect(b.ok && b.data).toMatchObject({ websiteStatus: "DOAR_PLATFORME", otherLinks: ["https://mero.ro/p/moto-barbershop"], email: "contact@moto.ro" });
    expect(b.ok && b.data.websiteUrl).toBeUndefined();

    const c = mapRow(toImportRaw(fade!, "HOTELURI"), map);
    expect(c.ok && c.data).toMatchObject({ category: "HOTELURI", zone: "MAMAIA", websiteStatus: "ARE_SITE_PROPRIU", websiteUrl: "https://fadeoclock.ro/", type: "ALTUL" });
    expect(c.ok && c.data.ratingGoogle).toBeUndefined();
  });

  it("propune categoria după căutare", () => {
    expect(guessCategory("frizerie Constanța")).toBe("BARBERSHOPURI");
    expect(guessCategory("barbershop constanta")).toBe("BARBERSHOPURI");
    expect(guessCategory("cafenea Mamaia")).toBe("RESTAURANTE");
    expect(guessCategory("salon unghii Constanta")).toBe("SALOANE_BEAUTY");
    expect(guessCategory("pensiune Eforie Nord")).toBe("HOTELURI");
    expect(guessCategory("instalator Constanta")).toBeNull();
  });

  it("numește fișierele ca aplicația separată", () => {
    expect(resultFileName("Frizerie Constanța", new Date(2026, 10, 14, 8, 59))).toBe("leaduri-frizerie-constanta-2026-11-14-0859.csv");
    expect(labelFromFileName("leaduri-frizerie-constanta-2026-11-14-0859-fara-site.csv")).toBe("frizerie constanta (fără site)");
    expect(labelFromFileName("leaduri-barbershop-constanta-2026-11-14-1019.csv")).toBe("barbershop constanta");
    expect(labelFromFileName("leaduri-2026-11-14-0826.csv")).toBe("căutare");
  });

  it("traduce jurnalul scraper-ului", () => {
    expect(describeLogLine('{"message":"job finished","status":"success","job":"https://www.google.com/maps/place/Fade+O+Clock/data"}'))
      .toEqual({ msg: "✓ Fade O Clock", found: true });
    expect(describeLogLine('{"message":"job finished","status":"failed","error":"timeout"}')).toMatchObject({ failed: true });
    expect(describeLogLine("ceva oarecare").msg).toBeNull();
  });
});
