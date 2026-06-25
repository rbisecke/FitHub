import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-14 w-14 rounded-full bg-[#161b22]" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 bg-[#161b22]" />
          <Skeleton className="h-3 w-48 bg-[#161b22]" />
          <Skeleton className="h-3 w-40 bg-[#161b22]" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-md bg-[#161b22]" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-9 w-full bg-[#161b22]" />
        <Skeleton className="h-9 w-full bg-[#161b22]" />
      </div>
    </div>
  );
}
