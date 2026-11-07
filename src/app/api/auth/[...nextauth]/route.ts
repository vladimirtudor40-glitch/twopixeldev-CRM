import { handlers } from "@/auth";
import { WEB_MODE } from "@/lib/web";

// În versiunea web (în site) login-ul e cel al site-ului: API-ul Auth.js nu există.
const notFound = () => new Response("Not found", { status: 404 });

export const GET = WEB_MODE ? notFound : handlers.GET;
export const POST = WEB_MODE ? notFound : handlers.POST;
