import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const dateFmt = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export const formatDate = (d: Date | string | null | undefined) => (d ? dateFmt.format(new Date(d)) : "");
export const formatDateTime = (d: Date | string | null | undefined) => (d ? dateTimeFmt.format(new Date(d)) : "");

/** „azi”, „ieri”, „acum 5 zile”. */
export function relativeDays(d: Date | string | null | undefined): string {
  if (!d) return "";
  const day = 86_400_000;
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date(d)) - start(new Date())) / day);
  if (diff === 0) return "azi";
  if (diff === -1) return "ieri";
  if (diff === 1) return "mâine";
  return diff < 0 ? `acum ${-diff} zile` : `peste ${diff} zile`;
}

export const formatNumber = (n: number) => new Intl.NumberFormat("ro-RO").format(n);
