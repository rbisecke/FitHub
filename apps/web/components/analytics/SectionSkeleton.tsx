"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Props {
  lines?: number;
  chartHeight?: string;
  className?: string;
}

export function SectionSkeleton({
  lines = 2,
  chartHeight = "h-48",
  className,
}: Props) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
      <Skeleton className={cn("w-full rounded-md", chartHeight)} />
    </div>
  );
}
