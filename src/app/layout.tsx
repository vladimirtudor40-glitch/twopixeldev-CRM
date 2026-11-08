import type { Metadata, Viewport } from "next";
// Fonturile vin din pachetul programului, nu de la Google la fiecare deschidere de pagină:
// fără internet sau cu internet lent, pagina nu mai așteaptă după fonts.googleapis.com.
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo/800.css";
import "@fontsource/instrument-sans/400.css";
import "@fontsource/instrument-sans/500.css";
import "@fontsource/instrument-sans/600.css";
import "@fontsource/instrument-sans/700.css";
// tema site-ului (versiunea web): JetBrains Mono pentru text, Unbounded pentru titluri
// (browserul descarcă un font doar dacă pagina îl folosește, deci programul de Windows nu le încarcă)
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/jetbrains-mono/700.css";
import "@fontsource/unbounded/600.css";
import "./globals.css";
import { WEB_MODE } from "@/lib/web";

/**
 * Versiunea web, în site: tema închisă / deschisă e cea aleasă în aplicația site-ului (cheia „tpd-theme”
 * din localStorage, comună pentru că CRM-ul e pe același domeniu) și se schimbă imediat odată cu ea.
 */
const SITE_THEME_SCRIPT = `(function(){var d=document.documentElement;function a(){var t="dark";try{if(localStorage.getItem("tpd-theme")==="light")t="light"}catch(e){}d.dataset.theme=t}a();addEventListener("storage",function(e){if(e.key==="tpd-theme"||e.key===null)a()})})()`;

export const metadata: Metadata = {
  title: { default: "twopixeldev CRM", template: "%s · twopixeldev CRM" },
  description: "Evidența unităților de cazare, de la prima găsire până devin clienți.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: WEB_MODE ? "#121419" : "#0A1828", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro" {...(WEB_MODE ? { "data-skin": "site", "data-theme": "dark", suppressHydrationWarning: true } : {})}>
      {WEB_MODE && (
        <head>
          <script dangerouslySetInnerHTML={{ __html: SITE_THEME_SCRIPT }} />
        </head>
      )}
      <body className="min-h-dvh bg-navy text-ink">{children}</body>
    </html>
  );
}
