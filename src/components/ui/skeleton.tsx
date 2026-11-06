import { cn } from "@/lib/utils";

/** Bloc gri pulsând, cât timp pagina vine de la server. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-navy-700/70", className)} />;
}

/** Anunță cititoarele de ecran că pagina se încarcă (scheletul în sine e ascuns). */
export function LoadingStatus() {
  return <span role="status" className="sr-only">Se încarcă…</span>;
}
