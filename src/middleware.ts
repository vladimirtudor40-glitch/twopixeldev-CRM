import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "./auth.config";
import { proxiedEmail, WEB_MODE } from "./lib/web";

const desktopAuth = NextAuth(authConfig).auth;

/**
 * Versiunea web (în site): intră doar cererile trimise de Worker-ul site-ului, după login-ul din site
 * (vezi src/lib/web.ts). Nu există pagină de login proprie, nici API-ul Auth.js.
 */
function webGate(req: NextRequest) {
  // Dacă middleware-ul (funcție edge pe Netlify) nu vede secretul, verificarea rămâne doar pe server:
  // requireUser() și fiecare acțiune refuză oricum o cerere fără secretul corect (src/server/session.ts).
  if (process.env.CRM_PROXY_SECRET && !proxiedEmail(req.headers)) {
    return new NextResponse("Neautorizat", { status: 401, headers: { "cache-control": "no-store" } });
  }
  if (req.nextUrl.pathname === "/login") return NextResponse.redirect(new URL("/", req.nextUrl));
  return NextResponse.next();
}

export default WEB_MODE ? webGate : desktopAuth;

export const config = {
  // tot în afară de API-ul de auth, fișiere statice și imagini
  // (în versiunea web, API-ul Auth.js răspunde 404: vezi src/app/api/auth/[...nextauth]/route.ts)
  matcher: ["/((?!api/auth|_next/static|_next/image|brand|favicon.ico).*)"],
};
