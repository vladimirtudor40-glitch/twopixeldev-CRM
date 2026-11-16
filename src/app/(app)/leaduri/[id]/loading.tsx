import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

// Fișa unei unități, cât timp vin datele.
export default function Loading() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <LoadingStatus />
      <div>
        <Skeleton className="mb-2 h-4 w-48" />
        <Skeleton className="mb-2 h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-11" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}
