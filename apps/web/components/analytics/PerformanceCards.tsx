interface MetricCard {
  label: string;
  value: number;
  sub: string;
  trendDirection: "up" | "down" | "flat";
  trendValue: string;
  valueIsNegative?: boolean;
  metricKey: "ctl" | "atl" | "tsb";
  badge: string;
  badgeColor: "blue" | "hot" | "muted";
}

interface PerformanceCardsProps {
  ctl: MetricCard;
  atl: MetricCard;
  tsb: MetricCard;
}

const BADGE_STYLES: Record<
  string,
  { color: string; bg: string; border: string }
> = {
  blue: {
    color: "var(--blue)",
    bg: "rgba(68,147,248,0.12)",
    border: "rgba(68,147,248,0.3)",
  },
  hot: {
    color: "var(--hot)",
    bg: "rgba(255,122,69,0.12)",
    border: "rgba(255,122,69,0.3)",
  },
  muted: {
    color: "var(--muted)",
    bg: "var(--surface-2)",
    border: "var(--border)",
  },
};

const METRIC_NUMBER_COLOR: Record<string, string> = {
  ctl: "var(--foreground)",
  atl: "var(--hot)",
  tsb: "var(--gold)",
};

export function PerformanceCards({ ctl, atl, tsb }: PerformanceCardsProps) {
  const cards = [ctl, atl, tsb];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-[14px] mb-[14px]">
      {cards.map((c) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const badgeStyle = BADGE_STYLES[c.badgeColor]!;
        return (
          <div
            key={c.label}
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-[18px_20px]"
          >
            {/* Label row: uppercase label + badge */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-[1px]">
                {c.label}
              </span>
              <span
                className="text-[9.5px] font-bold px-[7px] py-[2px] rounded-full whitespace-nowrap"
                style={{
                  color: badgeStyle.color,
                  background: badgeStyle.bg,
                  border: `1px solid ${badgeStyle.border}`,
                }}
              >
                {c.badge}
              </span>
            </div>

            {/* Big number */}
            <div
              className="font-heading text-[40px] leading-none mt-2"
              style={{ color: METRIC_NUMBER_COLOR[c.metricKey] }}
            >
              {c.value}
            </div>

            {/* Delta text */}
            {c.trendValue && (
              <div
                className="text-[11.5px] font-semibold mt-[5px]"
                style={{
                  color:
                    c.trendDirection === "up"
                      ? "var(--accent)"
                      : c.trendDirection === "down"
                        ? "var(--hot)"
                        : "var(--muted-foreground)",
                }}
              >
                {c.trendDirection === "up"
                  ? "▲"
                  : c.trendDirection === "down"
                    ? "▼"
                    : "—"}{" "}
                {c.trendValue}
              </div>
            )}

            {/* Description */}
            <div className="text-[11px] text-[var(--muted-foreground)] mt-[2px]">
              {c.sub}
            </div>
          </div>
        );
      })}
    </div>
  );
}
