import type { Metadata } from "next";
import Image from "next/image";
import { asset } from "@/lib/web";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Autentificare" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; dezactivat?: string }> }) {
  const { callbackUrl, dezactivat } = await searchParams;
  const redirectTo = safeRedirect(callbackUrl);
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Image src={asset("/brand/twopixeldev-logo.png")} alt="twopixeldev" width={240} height={34} priority className="mx-auto h-auto w-56" />
        <p className="mt-2 text-center text-[15px] font-semibold uppercase tracking-[0.18em] text-gold">CRM vânzări</p>
        <div className="mt-8 rounded-xl border border-navy-600 bg-navy-800 p-6">
          <h1 className="font-display text-lg font-bold">Intră în cont</h1>
          {dezactivat && (
            <p role="alert" className="mt-3 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-sm text-danger-hi">
              Contul tău a fost dezactivat sau șters. Cere-i unui administrator să-l reactiveze.
            </p>
          )}
          <LoginForm redirectTo={redirectTo} />
        </div>
      </div>
    </main>
  );
}

/** Acceptă doar căi din aplicație (și URL-uri absolute către același host, cum le trimite middleware-ul). */
function safeRedirect(url: string | undefined): string {
  if (!url) return "/";
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const u = new URL(url);
    const path = u.pathname + u.search;
    return path.startsWith("/login") ? "/" : path;
  } catch {
    return "/";
  }
}
