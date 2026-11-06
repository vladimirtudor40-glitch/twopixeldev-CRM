import type { Config } from "tailwindcss";

// Paleta twopixeldev: albastru închis clasic, turcoaz, auriu.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0A1828", 900: "#07121F", 800: "#0F2236", 700: "#14304A", 600: "#1F3B57" },
        teal: { DEFAULT: "#178582", hi: "#25A7A2" },
        gold: { DEFAULT: "#BFA181", hi: "#D7BE98" },
        ink: { DEFAULT: "#E8EEF3", muted: "#8EA2B6" },
        danger: "#D5675E",
        warn: "#D9A441",
        ok: "#43B48C",
      },
      fontFamily: {
        display: ["Archivo", "Segoe UI", "system-ui", "sans-serif"],
        sans: ["Instrument Sans", "Segoe UI", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
