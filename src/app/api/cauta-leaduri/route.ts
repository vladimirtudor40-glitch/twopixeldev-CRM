import { NextResponse, type NextRequest } from "next/server";
import { findInCrm } from "@/server/lead-search/in-crm";
import { listResultFiles, readResultFile, searchStatus } from "@/server/lead-search/runner";
import { sessionUserId } from "@/server/session";

export const dynamic = "force-dynamic";

/**
 * Citiri pentru pagina „Caută lead-uri” (pagina le cere des cât rulează o căutare):
 *  ?ce=stare             starea căutării + jurnalul
 *  ?ce=istoric           fișierele de rezultate
 *  ?ce=rezultate&fisier= firmele dintr-un fișier, cu cele aflate deja în CRM
 */
export async function GET(req: NextRequest) {
  await sessionUserId();
  const what = req.nextUrl.searchParams.get("ce");
  const headers = { "Cache-Control": "no-store" };
  try {
    if (what === "stare") return NextResponse.json(searchStatus(), { headers });
    if (what === "istoric") return NextResponse.json(listResultFiles(), { headers });
    if (what === "rezultate") {
      const file = req.nextUrl.searchParams.get("fisier") ?? "";
      const places = readResultFile(file);
      const withCrm = req.nextUrl.searchParams.get("crm") !== "0";
      const inCrm = withCrm ? await findInCrm(places) : {};
      return NextResponse.json({ file, places, inCrm }, { headers });
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Eroare" }, { status: 400, headers });
  }
  return NextResponse.json({ error: "Cerere necunoscută" }, { status: 400, headers });
}
