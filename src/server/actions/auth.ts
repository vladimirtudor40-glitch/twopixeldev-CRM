"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { TEMP_SESSION_COOKIE } from "@/lib/remember";

export type LoginState = { error: string; email: string; remember: boolean } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const remember = formData.get("remember") === "on";
  const sid = remember ? undefined : randomUUID();
  const jar = await cookies();
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      remember: remember ? "1" : "0",
      ...(sid ? { sid } : {}),
      redirectTo: String(formData.get("redirectTo") || "/"),
    });
    return null;
  } catch (err) {
    if (err instanceof AuthError) {
      return { error: "Email sau parolă greșită.", email: String(formData.get("email") ?? ""), remember };
    }
    // signIn reușit aruncă redirect-ul către aplicație: abia acum punem (sau scoatem) cookie-ul temporar
    if (sid) {
      // fără maxAge / expires: dispare când se închide programul (sau browserul)
      jar.set(TEMP_SESSION_COOKIE, sid, { httpOnly: true, sameSite: "lax", path: "/" });
    } else {
      jar.delete(TEMP_SESSION_COOKIE);
    }
    throw err;
  }
}

export async function logoutAction() {
  (await cookies()).delete(TEMP_SESSION_COOKIE);
  await signOut({ redirectTo: "/login" });
}
