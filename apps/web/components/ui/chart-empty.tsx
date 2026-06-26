import { cn } from "@/lib/utils";

interface ChartEmptyProps {
  /** Short reason there's nothing to plot. Keep it git/fitness-voiced. */
  message?: string;
  className?: string;
}

/**
 * Consistent empty state for charts that don't have enough data to plot.
 * One copy convention + one style, replacing the per-chart ad-hoc messages
 * (design 08 §6).
 */
export function ChartEmpty({
  message = "Not enough data yet",
  className,
}: ChartEmptyProps) {
  return (
    <div
      className={cn(
        "flex h-full min-h-12 items-center justify-center px-2 py-3 text-center",
        className,
      )}
    >
      <p className="font-mono text-xs text-[--muted]">{message}</p>
    </div>
  );
}
