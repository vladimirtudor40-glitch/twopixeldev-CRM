import type { Config } from "tailwindcss";

// Culorile vin din variabile CSS (src/app/globals.css): implicit paleta CRM-ului (albastru închis,
// turcoaz, auriu); în versiunea web, inclusă în site la /app/ → Clienți, paleta site-ului (data-skin="site").
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: v("navy"), 900: v("navy-900"), 850: v("navy-850"), 800: v("navy-800"), 700: v("navy-700"), 600: v("navy-600") },
        teal: { DEFAULT: v("teal"), hi: v("teal-hi"), soft: v("teal-soft") },
        gold: { DEFAULT: v("gold"), hi: v("gold-hi") },
        ink: { DEFAULT: v("ink"), muted: v("ink-muted") },
        // textul de pe butoanele / insignele colorate (bg-teal, bg-gold)
        "on-teal": v("on-teal"),
        "on-gold": v("on-gold"),
        danger: { DEFAULT: v("danger"), hi: v("danger-hi") },
        warn: v("warn"),
        ok: { DEFAULT: v("ok"), hi: v("ok-hi") },
      },
      borderRadius: {
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      // Mărimile de text sunt cu 4 px peste cele standard Tailwind (cerința lui Vladimir, 2026-11-06)
      fontSize: {
        xs: ["16px", { lineHeight: "22px" }],
        sm: ["18px", { lineHeight: "26px" }],
        base: ["20px", { lineHeight: "28px" }],
        lg: ["22px", { lineHeight: "30px" }],
        xl: ["24px", { lineHeight: "32px" }],
        "2xl": ["28px", { lineHeight: "36px" }],
        "3xl": ["34px", { lineHeight: "40px" }],
      },
      fontFamily: {
        display: ["var(--font-display)", "Segoe UI", "system-ui", "sans-serif"],
        sans: ["var(--font-body)", "Segoe UI", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
