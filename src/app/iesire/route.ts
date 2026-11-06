import { signOut } from "@/auth";

/** Închide sesiunea unui cont dezactivat (sau șters) și trimite la pagina de autentificare. */
export async function GET() {
  await signOut({ redirectTo: "/login?dezactivat=1" });
}
