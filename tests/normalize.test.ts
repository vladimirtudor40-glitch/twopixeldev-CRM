import { describe, expect, it } from "vitest";
import {
  buildSearchText, formatPhone, normalizeName, normalizePhone, normalizeText, osmIdFromUrl, parseNumber, searchTerms,
} from "@/lib/normalize";

describe("normalizeText", () => {
  it("scoate diacriticele, inclusiv ș/ț cu sedilă", () => {
    expect(normalizeText("Pensiunea Ștefănia")).toBe("pensiunea stefania");
    expect(normalizeText("Vila Ţărmul Însorit")).toBe("vila tarmul insorit");
    expect(normalizeText("  Hotel   Cireșica!! ")).toBe("hotel ciresica");
  });
});

describe("normalizeName", () => {
  it("ignoră cuvintele de tip", () => {
    expect(normalizeName("Pensiunea Maria")).toBe("maria");
    expect(normalizeName("Vila Maria")).toBe("maria");
    expect(normalizeName("Hotel Cireșica")).toBe("ciresica");
  });
  it("păstrează numele când rămâne gol", () => {
    expect(normalizeName("Hotel")).toBe("hotel");
    expect(normalizeName("Cazare")).toBe("cazare");
  });
});

describe("normalizePhone", () => {
  it("aduce numerele românești la formatul național", () => {
    expect(normalizePhone("+40 341 103 874")).toBe("0341103874");
    expect(normalizePhone("+40241831888")).toBe("0241831888");
    expect(normalizePhone("0040 722 123 456")).toBe("0722123456");
    expect(normalizePhone("0723251084")).toBe("0723251084");
  });
  it("păstrează primul număr dintr-o listă", () => {
    expect(normalizePhone("0722 111 222 / 0241 333 444")).toBe("0722111222");
  });
  it("lasă numerele străine doar cu cifre", () => {
    expect(normalizePhone("(800) 922-5548")).toBe("8009225548");
  });
  it("întoarce null pentru text fără număr", () => {
    expect(normalizePhone("nu are")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
  it("formatează pentru afișare", () => {
    expect(formatPhone("0722123456")).toBe("0722 123 456");
  });
});

describe("căutare", () => {
  it("găsește telefonul scris cu spații", () => {
    expect(searchTerms("0722 123 456")).toEqual(["0722123456"]);
    expect(searchTerms("+40 722 123 456")).toEqual(["0722123456"]);
  });
  it("împarte textul în cuvinte fără diacritice", () => {
    expect(searchTerms("Pensiunea Ștefania")).toEqual(["pensiunea", "stefania"]);
  });
  it("searchText conține și cifrele telefonului", () => {
    const s = buildSearchText(["Hotel Cireșica", "+40 341 103 874"]);
    expect(s).toContain("hotel ciresica");
    expect(s).toContain("40341103874");
  });
});

describe("diverse", () => {
  it("extrage ID-ul OSM", () => {
    expect(osmIdFromUrl("https://www.openstreetmap.org/node/9116508478")).toBe("node/9116508478");
    expect(osmIdFromUrl("https://www.openstreetmap.org/way/123")).toBe("way/123");
    expect(osmIdFromUrl("https://example.com")).toBeNull();
  });
  it("citește numere cu virgulă", () => {
    expect(parseNumber("44,216953")).toBeCloseTo(44.216953);
    expect(parseNumber("abc")).toBeNull();
  });
});
