import { LoadingStatus, Skeleton } from "@/components/ui/skeleton";

// Apare imediat la orice navigare, cât timp serverul aduce datele din baza de date.
export default function Loading() {
  return (
    <>
      <LoadingStatus />
      <div className="mb-5">
        <Skeleton className="mb-2 h-4 w-40" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-[104px] rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
    </>
  );
}
