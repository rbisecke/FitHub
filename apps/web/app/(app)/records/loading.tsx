import { Skeleton } from "@/components/ui/skeleton";

export default function RecordsLoading() {
  return (
    <div className="px-4 py-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-20 bg-[var(--surface)]" />
          <Skeleton className="h-7 w-40 bg-[var(--surface)]" />
        </div>
        <Skeleton className="h-7 w-32 bg-[var(--surface)] rounded" />
      </div>

      <div className="flex gap-2 md:hidden">
        {[80, 90, 64, 80].map((w, i) => (
          <Skeleton
            key={i}
            className="h-7 rounded-full bg-[var(--surface)]"
            style={{ width: w }}
          />
        ))}
      </div>

      <Skeleton className="h-4 w-32 bg-[var(--surface)]" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg bg-[var(--surface)]" />
        ))}
      </div>

      <Skeleton className="h-4 w-28 bg-[var(--surface)]" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg bg-[var(--surface)]" />
        ))}
      </div>
    </div>
  );
}
