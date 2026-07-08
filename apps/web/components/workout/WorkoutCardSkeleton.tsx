import { Skeleton } from "@/components/ui/skeleton";

export function WorkoutCardSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-3 w-3 rounded-full bg-[var(--surface-2)]" />
          <Skeleton className="h-3 w-16 bg-[var(--surface-2)]" />
          <Skeleton className="h-4 w-44 bg-[var(--surface-2)]" />
        </div>
        <Skeleton className="h-5 w-8 bg-[var(--surface-2)] rounded" />
      </div>
      <Skeleton className="h-3 w-28 mt-2 bg-[var(--surface-2)]" />
      <Skeleton className="h-3 w-20 mt-1.5 bg-[var(--surface-2)]" />
    </div>
  );
}
