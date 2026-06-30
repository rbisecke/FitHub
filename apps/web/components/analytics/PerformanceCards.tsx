interface MetricCard {
  label: string;
  value: number;
  sub: string;
  trendDirection: "up" | "down" | "flat";
  trendValue: string;
  valueIsNegative?: boolean;
}

interface PerformanceCardsProps {
  ctl: MetricCard;
  atl: MetricCard;
  tsb: MetricCard;
}

export function PerformanceCards({ ctl, atl, tsb }: PerformanceCardsProps) {
  const cards = [ctl, atl, tsb];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-[18px]">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5"
        >
          <div className="text-[12px] text-[var(--muted-foreground)] uppercase tracking-wide">
            {c.label}
          </div>
          <div
            className="font-heading text-[40px] leading-none mt-1"
            style={{
              color: c.valueIsNegative ? "var(--hot)" : "var(--foreground)",
            }}
          >
            {c.value > 0 && !c.valueIsNegative ? "" : ""}
            {c.value}
          </div>
          <div className="text-[12px] text-[var(--muted-foreground)] mt-1">
            {c.sub}
          </div>
          {c.trendValue && (
            <div
              className="text-[12px] font-semibold mt-2"
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
        </div>
      ))}
    </div>
  );
}
