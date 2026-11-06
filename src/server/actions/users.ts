"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { userCreateSchema, userUpdateSchema } from "@/lib/validators/user";
import { auditData, diff } from "@/server/audit";
import { canManageUsers } from "@/server/permissions";
import { requireUser } from "@/server/session";
import type { ActionResult } from "./types";

function formValues(formData: FormData) {
  const get = (k: string) => String(formData.get(k) ?? "");
  return {
    id: get("id"),
    name: get("name"),
    email: get("email"),
    phone: get("phone"),
    role: get("role"),
    active: formData.get("active") === "on",
    password: get("password"),
  };
}

export async function createUserAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  if (!canManageUsers(me)) return { ok: false, error: "Doar un administrator poate adăuga utilizatori." };
  const parsed = userCreateSchema.safeParse(formValues(formData));
  if (!parsed.success) return { ok: false, error: "Verifică câmpurile marcate.", fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } });
  if (existing) return { ok: false, error: "Există deja un utilizator cu acest email.", fieldErrors: { email: ["Email folosit deja."] } };

  const passwordHash = await bcrypt.hash(d.password, 12);
  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { name: d.name, email: d.email, phone: d.phone, role: d.role, passwordHash, active: true },
    });
    await tx.auditLog.create({
      data: auditData({ userId: me.id, action: "CREARE", entityType: "User", entityId: created.id, meta: { email: d.email, role: d.role } }),
    });
  });
  revalidatePath("/utilizatori");
  return { ok: true, message: `Contul pentru ${d.name} a fost creat. Se poate autentifica cu ${d.email} și parola aleasă.` };
}

export async function updateUserAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  if (!canManageUsers(me)) return { ok: false, error: "Doar un administrator poate modifica utilizatori." };
  const parsed = userUpdateSchema.safeParse(formValues(formData));
  if (!parsed.success) return { ok: false, error: "Verifică câmpurile marcate.", fieldErrors: parsed.error.flatten().fieldErrors };
  const d = parsed.data;

  const before = await prisma.user.findUnique({ where: { id: d.id } });
  if (!before) return { ok: false, error: "Utilizatorul nu mai există." };

  if (d.id === me.id && !d.active) return { ok: false, error: "Nu îți poți dezactiva propriul cont." };
  const losesAdmin = before.role === "ADMIN" && before.active && (d.role !== "ADMIN" || !d.active);
  if (losesAdmin) {
    const otherAdmins = await prisma.user.count({ where: { role: "ADMIN", active: true, id: { not: d.id } } });
    if (otherAdmins === 0) return { ok: false, error: "Trebuie să rămână cel puțin un administrator activ." };
  }
  if (d.email !== before.email) {
    const taken = await prisma.user.findUnique({ where: { email: d.email }, select: { id: true } });
    if (taken) return { ok: false, error: "Există deja un utilizator cu acest email.", fieldErrors: { email: ["Email folosit deja."] } };
  }

  const data = { name: d.name, email: d.email, phone: d.phone, role: d.role, active: d.active };
  const changes = diff(before as unknown as Record<string, unknown>, data, ["name", "email", "phone", "role", "active"]);
  const passwordHash = d.password ? await bcrypt.hash(d.password, 12) : null;

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: d.id }, data: passwordHash ? { ...data, passwordHash } : data });
    if (Object.keys(changes).length || passwordHash) {
      await tx.auditLog.create({
        data: auditData({
          userId: me.id,
          action: "ACTUALIZARE",
          entityType: "User",
          entityId: d.id,
          changes,
          meta: passwordHash ? { parolaSchimbata: true } : undefined,
        }),
      });
    }
  });
  revalidatePath("/utilizatori");
  return { ok: true, message: passwordHash ? "Modificările și parola nouă au fost salvate." : "Modificările au fost salvate." };
}
