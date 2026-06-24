import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="rounded-lg border border-[--border] bg-[--surface] p-6 mb-6">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-5 w-full mb-1" />
        <Skeleton className="h-5 w-3/4 mb-5" />
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Streak + week mini */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>

      {/* Contribution graph */}
      <Skeleton className="h-56 w-full rounded-lg mb-6" />

      {/* PRs */}
      <Skeleton className="h-14 w-full rounded-lg mb-2" />
      <Skeleton className="h-14 w-full rounded-lg" />
    </div>
  );
}
