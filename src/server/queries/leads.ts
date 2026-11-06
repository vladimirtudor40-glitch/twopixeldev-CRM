import "server-only";
import { cache } from "react";
import type { LeadCategory, PipelineStage, Prisma, Priority, PropertyType, WebsiteStatus, Zone } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { CATEGORIES, PRIORITIES, STAGES, TYPES, WEBSITE_STATUSES, ZONES } from "@/lib/labels";
import { searchTerms } from "@/lib/normalize";

export const PAGE_SIZE = 50;

const multi = <T extends string>(values: readonly T[]) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : (Array.isArray(v) ? v : v.split(",")).filter((x): x is T => (values as readonly string[]).includes(x))));

export const SORTS = ["prioritate", "nume", "categorie", "zona", "etapa", "ultima", "camere", "adaugat"] as const;

/** Filtrele din URL (?categorie=HOTELURI&zona=MAMAIA,EFORIE_NORD&prioritate=A&q=...). Fără `categorie` = toate categoriile. */
export const leadFiltersSchema = z.object({
  q: z.string().optional().default(""),
  categorie: multi<LeadCategory>(CATEGORIES),
  zona: multi<Zone>(ZONES),
  tip: multi<PropertyType>(TYPES),
  prioritate: multi<Priority>(PRIORITIES),
  site: multi<WebsiteStatus>(WEBSITE_STATUSES),
  etapa: multi<PipelineStage>(STAGES),
  telefon: z.enum(["da", "nu"]).optional(),
  ultima: z.enum(["niciodata", "14", "30"]).optional(),
  responsabil: z.string().optional(),
  optout: z.enum(["ascunde", "doar"]).optional(),
  arhivate: z.enum(["da"]).optional(),
  sort: z.enum(SORTS).optional().default("prioritate"),
  dir: z.enum(["asc", "desc"]).optional().default("asc"),
  pagina: z.coerce.number().int().min(1).optional().default(1),
});
export type LeadFilters = z.output<typeof leadFiltersSchema>;

export function parseLeadFilters(sp: Record<string, string | string[] | undefined>): LeadFilters {
  const r = leadFiltersSchema.safeParse(sp);
  return r.success ? r.data : leadFiltersSchema.parse({});
}

export function buildLeadWhere(f: LeadFilters, currentUserId: string): Prisma.LeadWhereInput {
  const and: Prisma.LeadWhereInput[] = [];
  and.push(f.arhivate === "da" ? { archivedAt: { not: null } } : { archivedAt: null });
  for (const term of searchTerms(f.q)) and.push({ searchText: { contains: term } });
  if (f.categorie.length) and.push({ category: { in: f.categorie } });
  if (f.zona.length) and.push({ zone: { in: f.zona } });
  if (f.tip.length) and.push({ type: { in: f.tip } });
  if (f.prioritate.length) and.push({ priority: { in: f.prioritate } });
  if (f.site.length) and.push({ websiteStatus: { in: f.site } });
  if (f.etapa.length) and.push({ stage: { in: f.etapa } });
  if (f.telefon === "da") and.push({ phoneNormalized: { not: null } });
  if (f.telefon === "nu") and.push({ phoneNormalized: null });
  if (f.ultima === "niciodata") and.push({ lastInteractionAt: null });
  if (f.ultima === "14" || f.ultima === "30") {
    const since = new Date(Date.now() - Number(f.ultima) * 86_400_000);
    and.push({ OR: [{ lastInteractionAt: null }, { lastInteractionAt: { lt: since } }] });
  }
  if (f.responsabil === "eu") and.push({ ownerId: currentUserId });
  else if (f.responsabil === "liber") and.push({ ownerId: null });
  else if (f.responsabil) and.push({ ownerId: f.responsabil });
  if (f.optout === "ascunde") and.push({ doNotContact: false });
  if (f.optout === "doar") and.push({ doNotContact: true });
  return { AND: and };
}

function buildOrder(f: LeadFilters): Prisma.LeadOrderByWithRelationInput[] {
  const d = f.dir;
  switch (f.sort) {
    case "nume": return [{ nameNormalized: d }];
    case "categorie": return [{ category: d }, { priority: "asc" }, { nameNormalized: "asc" }];
    case "zona": return [{ zone: d }, { nameNormalized: "asc" }];
    case "etapa": return [{ stage: d }, { nameNormalized: "asc" }];
    case "ultima": return [{ lastInteractionAt: { sort: d, nulls: "last" } }, { nameNormalized: "asc" }];
    case "camere": return [{ roomsCount: { sort: d, nulls: "last" } }, { nameNormalized: "asc" }];
    case "adaugat": return [{ createdAt: d }];
    default: return [{ priority: d }, { phoneNormalized: { sort: "asc", nulls: "last" } }, { nameNormalized: "asc" }];
  }
}

export async function listLeads(f: LeadFilters, currentUserId: string) {
  const where = buildLeadWhere(f, currentUserId);
  const [total, rows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: buildOrder(f),
      skip: (f.pagina - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true, name: true, category: true, type: true, zone: true, address: true, phone: true, email: true,
        priority: true, stage: true, websiteStatus: true, roomsCount: true, starsOsm: true,
        lastInteractionAt: true, doNotContact: true, archivedAt: true,
        owner: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);
  return { total, rows, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

/** Cu cache pe cerere: titlul paginii (generateMetadata) și pagina folosesc aceeași interogare. */
export const getLeadDetail = cache(async (id: string) => {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      createdBy: { select: { name: true, email: true } },
      doNotContactBy: { select: { name: true, email: true } },
      contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }] },
      tags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
      importRows: {
        orderBy: { batch: { createdAt: "desc" } },
        take: 10,
        include: { batch: { select: { id: true, fileName: true, createdAt: true } } },
      },
    },
  });
});

export async function getLeadAudit(id: string) {
  return prisma.auditLog.findMany({
    where: { entityId: id, entityType: { in: ["Lead", "Contact"] } },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { user: { select: { name: true, email: true } } },
  });
}

export async function listActiveUsers() {
  return prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, email: true } });
}
