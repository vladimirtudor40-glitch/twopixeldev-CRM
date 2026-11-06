import type { LeadCategory } from "@prisma/client";
import { Hotel, Scissors, Sparkles, Ticket, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/labels";

/**
 * Sub-categoriile din meniul lateral „Lead-uri”. Toate lead-urile stau în aceeași tabelă,
 * diferențiate prin câmpul `category`; fiecare intrare deschide lista filtrată (/leaduri?categorie=…).
 * `slug` păstrează vechile adrese /categorii/<slug>, care acum redirecționează spre listă.
 */
export const LEAD_CATEGORIES: { value: LeadCategory; slug: string; label: string; icon: LucideIcon }[] = [
  { value: "HOTELURI", slug: "hoteluri", label: CATEGORY_LABEL.HOTELURI, icon: Hotel },
  { value: "BARBERSHOPURI", slug: "barbershopuri", label: CATEGORY_LABEL.BARBERSHOPURI, icon: Scissors },
  { value: "RESTAURANTE", slug: "restaurante", label: CATEGORY_LABEL.RESTAURANTE, icon: UtensilsCrossed },
  { value: "ACTIVITATI", slug: "activitati", label: CATEGORY_LABEL.ACTIVITATI, icon: Ticket },
  { value: "SALOANE_BEAUTY", slug: "saloane-beauty", label: CATEGORY_LABEL.SALOANE_BEAUTY, icon: Sparkles },
];

export const CATEGORY_ICON = Object.fromEntries(LEAD_CATEGORIES.map((c) => [c.value, c.icon])) as Record<LeadCategory, LucideIcon>;

export const categoryHref = (value: LeadCategory) => `/leaduri?categorie=${value}`;
