import { Skeleton } from "@/components/ui/skeleton";

export function WorkoutCardSkeleton() {
  return (
    <div className="rounded-lg border border-[#30363d] bg-[#161b22] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-3 w-3 rounded-full bg-[#21262d]" />
          <Skeleton className="h-3 w-16 bg-[#21262d]" />
          <Skeleton className="h-4 w-44 bg-[#21262d]" />
        </div>
        <Skeleton className="h-5 w-8 bg-[#21262d] rounded" />
      </div>
      <Skeleton className="h-3 w-28 mt-2 bg-[#21262d]" />
      <Skeleton className="h-3 w-20 mt-1.5 bg-[#21262d]" />
    </div>
  );
}
