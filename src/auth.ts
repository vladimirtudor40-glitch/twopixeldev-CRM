import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
  remember: z.enum(["0", "1"]).default("1"),
  sid: z.string().uuid().optional(),
});

class InvalidLogin extends CredentialsSignin {
  code = "date_gresite";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: { label: "Email" }, password: { label: "Parolă", type: "password" }, remember: {}, sid: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) throw new InvalidLogin();
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        if (!user || !user.active || !user.passwordHash) throw new InvalidLogin();
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) throw new InvalidLogin();
        await prisma.$transaction([
          prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
          prisma.auditLog.create({ data: { userId: user.id, action: "LOGIN", entityType: "User", entityId: user.id } }),
        ]);
        const remember = parsed.data.remember === "1";
        return { id: user.id, email: user.email, name: user.name, role: user.role, remember, sid: remember ? undefined : parsed.data.sid };
      },
    }),
  ],
});
