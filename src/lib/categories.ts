import { Scissors, Sparkles, Ticket, UtensilsCrossed, type LucideIcon } from "lucide-react";

/** Sub-categoriile de lead-uri din meniul lateral (în afară de unitățile de cazare). */
export const LEAD_CATEGORIES: { slug: string; label: string; icon: LucideIcon }[] = [
  { slug: "barbershopuri", label: "Barbershopuri", icon: Scissors },
  { slug: "restaurante", label: "Restaurante", icon: UtensilsCrossed },
  { slug: "activitati", label: "Activități", icon: Ticket },
  { slug: "saloane-beauty", label: "Saloane beauty", icon: Sparkles },
];
