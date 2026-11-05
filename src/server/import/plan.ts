import type { ImportRowAction } from "@prisma/client";
import { mapRow, type ColumnMap, type LeadImportData } from "./fields";
import { DedupeIndex, type IndexEntry, type MatchKind } from "./match";

/** Un lead existent: cheile de potrivire + valorile actuale ale câmpurilor care se pot completa. */
export type ExistingLead = IndexEntry & { values: Partial<Record<FillableKey, unknown>> };

/** Câmpurile pe care importul le poate completa. Nume, zonă, sursă și prioritate nu se schimbă la re-import. */
export const FILLABLE_KEYS = [
  "type", "address", "latitude", "longitude", "phone", "phoneNormalized", "email", "starsOsm",
  "categoryMinistry", "roomsCount", "placesCount", "websiteStatus", "websiteUrl", "bookingUrl",
  "facebookUrl", "instagramUrl", "otherLinks", "googleMapsUrl", "osmUrl", "osmId", "operatorName",
  "operatorCui", "inMinistryList", "manualCheckNote",
] as const;
export type FillableKey = (typeof FILLABLE_KEYS)[number];

/** Câmpuri care se completează împreună (primul decide dacă e gol). */
const GROUPS: FillableKey[][] = [
  ["phoneNormalized", "phone"],
  ["osmId", "osmUrl"],
  ["latitude", "longitude"],
];
const GROUPED = new Set(GROUPS.flat());

/** Ce înseamnă „gol” pentru fiecare câmp. */
export function isEmptyValue(key: FillableKey, value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (key === "type") return value === "ALTUL";
  if (key === "websiteStatus") return value === "NECUNOSCUT";
  if (key === "inMinistryList") return value === false;
  return false;
}

/** Calculează ce câmpuri goale ar completa `incoming` peste `current`. Nu suprascrie nimic completat. */
export function fillEmpty(
  current: Partial<Record<FillableKey, unknown>>,
  incoming: Partial<LeadImportData>,
): { patch: Partial<Record<FillableKey, unknown>>; fields: FillableKey[] } {
  const patch: Partial<Record<FillableKey, unknown>> = {};
  const fields: FillableKey[] = [];
  const consider = (lead: FillableKey, keys: FillableKey[]) => {
    const value = incoming[lead];
    if (isEmptyValue(lead, value) || !isEmptyValue(lead, current[lead])) return;
    for (const k of keys) if (incoming[k] !== undefined) patch[k] = incoming[k];
    fields.push(lead);
  };
  for (const group of GROUPS) consider(group[0]!, group);
  for (const key of FILLABLE_KEYS) if (!GROUPED.has(key)) consider(key, [key]);
  return { patch, fields };
}

export type RowPlan = {
  rowNumber: number;
  action: ImportRowAction;
  leadId: string | null;
  matchedBy: MatchKind | null;
  /** câmpurile completate (pentru ACTUALIZAT) */
  updatedFields: FillableKey[];
  error: string | null;
  name: string | null;
  /** id-ul rândului anterior din același fișier cu care s-a unit (duplicat în fișier) */
  mergedIntoRow: number | null;
};

export type ImportPlan = {
  rows: RowPlan[];
  creates: Map<string, LeadImportData>;
  updates: Map<string, Partial<Record<FillableKey, unknown>>>;
  summary: { total: number; create: number; update: number; unchanged: number; skipped: number; error: number };
};

export type PlanInput = {
  rows: { rowNumber: number; raw: Record<string, string>; excluded?: boolean }[];
  columnMap: ColumnMap;
  existing: ExistingLead[];
  newId: () => string;
};

/**
 * Planul importului, fără să scrie nimic: pentru fiecare rând decide dacă e lead nou,
 * dacă completează câmpuri goale ale unui lead existent sau dacă nu aduce nimic nou.
 * Rândurile duplicate din același fișier se unesc cu primul.
 */
export function planImport({ rows, columnMap, existing, newId }: PlanInput): ImportPlan {
  const index = new DedupeIndex(existing);
  const current = new Map<string, Partial<Record<FillableKey, unknown>>>(existing.map((e) => [e.id, { ...e.values }]));
  const entries = new Map<string, IndexEntry>(existing.map((e) => [e.id, e]));
  const createdAtRow = new Map<string, number>();
  const creates = new Map<string, LeadImportData>();
  const updates = new Map<string, Partial<Record<FillableKey, unknown>>>();
  const out: RowPlan[] = [];
  const summary = { total: rows.length, create: 0, update: 0, unchanged: 0, skipped: 0, error: 0 };

  for (const row of rows) {
    const base: RowPlan = {
      rowNumber: row.rowNumber, action: "IGNORAT", leadId: null, matchedBy: null,
      updatedFields: [], error: null, name: null, mergedIntoRow: null,
    };
    if (row.excluded) {
      out.push(base);
      summary.skipped++;
      continue;
    }
    const mapped = mapRow(row.raw, columnMap);
    if (!mapped.ok) {
      out.push({ ...base, action: "EROARE", error: mapped.error });
      summary.error++;
      continue;
    }
    const data = mapped.data;
    base.name = data.name;
    const hit = index.find(data);

    if (!hit) {
      const id = newId();
      creates.set(id, data);
      createdAtRow.set(id, row.rowNumber);
      const entry: IndexEntry = {
        id, osmId: data.osmId ?? null, nameNormalized: data.nameNormalized, zone: data.zone,
        phoneNormalized: data.phoneNormalized ?? null,
      };
      index.add(entry);
      entries.set(id, entry);
      current.set(id, { ...data });
      out.push({ ...base, action: "CREAT", leadId: id });
      summary.create++;
      continue;
    }

    const leadId = hit.entry.id;
    const cur = current.get(leadId) ?? {};
    const { patch, fields } = fillEmpty(cur, data);
    const mergedIntoRow = createdAtRow.get(leadId) ?? null;
    if (fields.length) {
      Object.assign(cur, patch);
      current.set(leadId, cur);
      const pending = creates.get(leadId);
      if (pending) Object.assign(pending, patch);
      else updates.set(leadId, { ...(updates.get(leadId) ?? {}), ...patch });
      const entry = entries.get(leadId);
      if (entry) {
        if (patch.phoneNormalized) entry.phoneNormalized = patch.phoneNormalized as string;
        if (patch.osmId) entry.osmId = patch.osmId as string;
        index.update(entry);
      }
      out.push({ ...base, action: "ACTUALIZAT", leadId, matchedBy: hit.by, updatedFields: fields, mergedIntoRow });
      summary.update++;
    } else {
      out.push({ ...base, action: "NESCHIMBAT", leadId, matchedBy: hit.by, mergedIntoRow });
      summary.unchanged++;
    }
  }
  return { rows: out, creates, updates, summary };
}
