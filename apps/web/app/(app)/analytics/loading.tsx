import { SectionSkeleton } from "@/components/analytics/SectionSkeleton";

export default function AnalyticsLoading() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="space-y-1">
        <div className="h-6 w-40 bg-[--surface] rounded animate-pulse" />
        <div className="h-4 w-56 bg-[--surface] rounded animate-pulse" />
      </div>
      <SectionSkeleton lines={2} chartHeight="h-32" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionSkeleton chartHeight="h-52" />
        <SectionSkeleton chartHeight="h-48" />
        <SectionSkeleton chartHeight="h-40" />
        <SectionSkeleton chartHeight="h-40" />
      </div>
    </div>
  );
}
