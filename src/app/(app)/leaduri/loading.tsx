import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

// Lista de lead-uri: header-ul și tab-urile rămân pe loc (sunt în layout), doar tabelul se încarcă.
export default function Loading() {
  return (
    <>
      <LoadingStatus />
      <div className="mb-3 flex flex-wrap gap-2">
        <Skeleton className="h-10 w-full max-w-md" />
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-10 w-28" />)}
      </div>
      <Skeleton className="mb-2 h-4 w-32" />
      <div className="overflow-hidden rounded-xl border border-navy-600 bg-navy-800">
        <div className="h-10 bg-navy-850" />
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 border-t border-navy-600 px-3 py-3">
            <Skeleton className="h-5 w-7" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-5 w-24 md:block" />
            <Skeleton className="hidden h-5 w-28 md:block" />
            <Skeleton className="hidden h-5 w-24 md:block" />
          </div>
        ))}
      </div>
    </>
  );
}
