import { cookies } from "next/headers";
import { signOut } from "@/auth";
import { TEMP_SESSION_COOKIE } from "@/lib/remember";
import { WEB_MODE } from "@/lib/web";

/** Închide sesiunea unui cont dezactivat (sau șters) și trimite la pagina de autentificare. */
export async function GET() {
  if (WEB_MODE) {
    // în site nu avem sesiune proprie de închis: contul din site există, dar e dezactivat în CRM
    return new Response(
      "<!doctype html><meta charset=utf-8><body style=\"font-family:system-ui;padding:32px\">Contul tău e dezactivat în CRM. Cere-i unui administrator să-l reactiveze din Utilizatori.</body>",
      { status: 403, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
    );
  }
  (await cookies()).delete(TEMP_SESSION_COOKIE);
  await signOut({ redirectTo: "/login?dezactivat=1" });
}
