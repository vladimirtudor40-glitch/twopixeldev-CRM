import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v));

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, "Scrie numele (minim 2 litere).").max(80),
  email: z.string().trim().toLowerCase().email("Adresa de email nu e validă."),
  phone: optionalText(40),
  role: z.enum(["ADMIN", "AGENT_VANZARI"], { message: "Alege rolul." }),
  password: z.string().min(10, "Parola trebuie să aibă cel puțin 10 caractere.").max(200),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Scrie numele (minim 2 litere).").max(80),
  email: z.string().trim().toLowerCase().email("Adresa de email nu e validă."),
  phone: optionalText(40),
  role: z.enum(["ADMIN", "AGENT_VANZARI"], { message: "Alege rolul." }),
  active: z.boolean(),
  password: z
    .string()
    .max(200)
    .refine((v) => v === "" || v.length >= 10, "Parola nouă trebuie să aibă cel puțin 10 caractere."),
});

export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserUpdateInput = z.input<typeof userUpdateSchema>;
