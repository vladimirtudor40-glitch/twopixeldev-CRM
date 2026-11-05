import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  // tot în afară de API-ul de auth, fișiere statice și imagini
  matcher: ["/((?!api/auth|_next/static|_next/image|brand|favicon.ico).*)"],
};
