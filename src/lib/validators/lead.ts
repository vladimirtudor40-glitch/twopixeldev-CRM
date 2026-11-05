import { z } from "zod";
import { PRIORITIES, SOURCES, TYPES, WEBSITE_STATUSES, ZONES } from "@/lib/labels";

const optionalText = (max = 500) =>
  z.string().trim().max(max, `Maxim ${max} caractere.`).optional().transform((v) => (v ? v : null));

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^https?:\/\/\S+\.\S+/i.test(v) || /^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(v), {
    message: "Link invalid. Exemplu: https://www.exemplu.ro",
  })
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v));

const optionalNumber = (min: number, max: number, msg: string) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : Number(String(v).replace(",", "."))))
    .refine((v) => v === null || (Number.isFinite(v) && v >= min && v <= max), { message: msg });

const optionalInt = (max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v === undefined || v === "" ? null : Number(v)))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 0 && v <= max), { message: "Număr întreg pozitiv." });

export const leadFormSchema = z
  .object({
    name: z.string().trim().min(2, "Scrie numele unității.").max(200),
    type: z.enum(TYPES as [string, ...string[]]),
    zone: z.enum(ZONES as [string, ...string[]]),
    address: optionalText(300),
    latitude: optionalNumber(-90, 90, "Latitudine între -90 și 90."),
    longitude: optionalNumber(-180, 180, "Longitudine între -180 și 180."),
    phone: optionalText(60),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v), { message: "Email invalid." }),
    starsOsm: optionalInt(5),
    categoryMinistry: optionalText(60),
    roomsCount: optionalInt(5000),
    placesCount: optionalInt(20000),
    websiteStatus: z.enum(WEBSITE_STATUSES as [string, ...string[]]),
    websiteUrl: optionalUrl,
    bookingUrl: optionalUrl,
    facebookUrl: optionalUrl,
    instagramUrl: optionalUrl,
    googleMapsUrl: optionalUrl,
    ratingGoogle: optionalNumber(1, 5, "Rating Google între 1 și 5."),
    ratingBooking: optionalNumber(1, 10, "Rating Booking între 1 și 10."),
    operatorName: optionalText(200),
    operatorCui: optionalText(20),
    source: z.enum(SOURCES as [string, ...string[]]),
    priority: z.enum(PRIORITIES as [string, ...string[]]),
    ownerId: z.string().optional().transform((v) => (v ? v : null)),
    tags: z
      .string()
      .optional()
      .transform((v) =>
        Array.from(new Set((v ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))).slice(0, 20),
      ),
    notes: optionalText(5000),
  })
  .refine((d) => (d.latitude === null) === (d.longitude === null), {
    message: "Completează și latitudinea, și longitudinea (sau niciuna).",
    path: ["longitude"],
  });

export type LeadFormInput = z.input<typeof leadFormSchema>;
export type LeadFormData = z.output<typeof leadFormSchema>;
