"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type LoginState = { error: string; email: string } | null;

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: String(formData.get("redirectTo") || "/"),
    });
    return null;
  } catch (err) {
    if (err instanceof AuthError) return { error: "Email sau parolă greșită.", email: String(formData.get("email") ?? "") };
    throw err;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/login" });
}
