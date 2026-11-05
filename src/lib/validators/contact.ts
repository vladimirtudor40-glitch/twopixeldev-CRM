import { z } from "zod";
import { CHANNELS, CONTACT_ROLES } from "@/lib/labels";

export const contactFormSchema = z
  .object({
    name: z.string().trim().min(2, "Scrie numele persoanei.").max(120),
    role: z.enum(CONTACT_ROLES as [string, ...string[]]),
    phone: z.string().trim().max(60).optional().transform((v) => (v ? v : null)),
    whatsapp: z.string().trim().max(60).optional().transform((v) => (v ? v : null)),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(v), { message: "Email invalid." }),
    preferredChannel: z.enum(CHANNELS as [string, ...string[]]),
    isPrimary: z.boolean().optional().default(false),
    notes: z.string().trim().max(2000).optional().transform((v) => (v ? v : null)),
  })
  .refine((d) => d.phone || d.email || d.whatsapp, { message: "Adaugă cel puțin un telefon sau un email.", path: ["phone"] });

export type ContactFormInput = z.input<typeof contactFormSchema>;
export type ContactFormData = z.output<typeof contactFormSchema>;
