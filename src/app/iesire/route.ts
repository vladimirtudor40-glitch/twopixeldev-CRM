import { cookies } from "next/headers";
import { signOut } from "@/auth";
import { TEMP_SESSION_COOKIE } from "@/lib/remember";

/** Închide sesiunea unui cont dezactivat (sau șters) și trimite la pagina de autentificare. */
export async function GET() {
  (await cookies()).delete(TEMP_SESSION_COOKIE);
  await signOut({ redirectTo: "/login?dezactivat=1" });
}
