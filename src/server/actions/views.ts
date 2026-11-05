"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/server/session";
import type { ActionResult } from "./types";

const schema = z.object({
  name: z.string().trim().min(2, "Dă un nume vederii.").max(60),
  query: z.string().max(2000),
  isShared: z.boolean().default(false),
});

/** Salvează filtrele curente (query string-ul paginii) ca vedere. */
export async function saveView(input: { name: string; query: string; isShared?: boolean }): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Date invalide." };
  const params = Object.fromEntries(new URLSearchParams(parsed.data.query));
  delete params.pagina;
  await prisma.savedView.upsert({
    where: { userId_name: { userId: user.id, name: parsed.data.name } },
    update: { filters: params, isShared: parsed.data.isShared && user.role === "ADMIN" },
    create: { userId: user.id, name: parsed.data.name, filters: params, isShared: parsed.data.isShared && user.role === "ADMIN", columns: [] },
  });
  revalidatePath("/leaduri");
  return { ok: true, message: `Vederea „${parsed.data.name}” a fost salvată.` };
}

export async function deleteView(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const res = await prisma.savedView.deleteMany({ where: { id, ...(user.role === "ADMIN" ? {} : { userId: user.id }) } });
  if (!res.count) return { ok: false, error: "Poți șterge doar vederile tale." };
  revalidatePath("/leaduri");
  return { ok: true };
}
