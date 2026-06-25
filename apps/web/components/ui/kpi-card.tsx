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
  up: { icon: "↑", color: "text-[--green]" },
  down: { icon: "↓", color: "text-[--red]" },
  neutral: { icon: "→", color: "text-[--muted]" },
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
        "rounded-lg border border-[--border] bg-[--surface] px-4 py-3",
        className,
      )}
    >
      <p className="font-mono text-xs text-[--muted] mb-1">{label}</p>
      <p className="font-mono text-2xl font-semibold text-[--text] leading-none">
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
            <span className="font-mono text-xs text-[--muted]">{subtext}</span>
          )}
        </div>
      )}
    </div>
  );
}
