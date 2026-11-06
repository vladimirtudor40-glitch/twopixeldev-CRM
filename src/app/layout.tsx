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
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "twopixeldev CRM", template: "%s · twopixeldev CRM" },
  description: "Evidența unităților de cazare, de la prima găsire până devin clienți.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0A1828", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ro">
      <body className="min-h-dvh bg-navy text-ink">{children}</body>
    </html>
  );
}
