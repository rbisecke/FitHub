import { cn } from "@/lib/utils";

type Trend = "up" | "down" | "neutral";

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: Trend;
  trendValue?: string;
  className?: string;
}

const TREND_STYLES: Record<Trend, { icon: string; color: string }> = {
  up: { icon: "↑", color: "text-emerald-400" },
  down: { icon: "↓", color: "text-red-400" },
  neutral: { icon: "→", color: "text-zinc-500" },
};

export function KpiCard({
  label,
  value,
  subtext,
  trend,
  trendValue,
  className,
}: KpiCardProps) {
  const trendStyle = trend ? TREND_STYLES[trend] : null;

  return (
    <div
      className={cn(
        "rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3",
        className,
      )}
    >
      <p className="font-mono text-xs text-zinc-500 mb-1">{label}</p>
      <p className="font-mono text-2xl font-semibold text-zinc-100 leading-none">
        {value}
      </p>
      {(subtext || trendStyle) && (
        <div className="flex items-center gap-2 mt-1">
          {trendStyle && trendValue && (
            <span className={cn("font-mono text-xs", trendStyle.color)}>
              {trendStyle.icon} {trendValue}
            </span>
          )}
          {subtext && (
            <span className="font-mono text-xs text-zinc-600">{subtext}</span>
          )}
        </div>
      )}
    </div>
  );
}
