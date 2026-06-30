interface Stat {
  label: string;
  value: string | number;
  sub: string;
  trend?: { direction: "up" | "down"; value: string };
  valueColor?: "accent" | "hot";
}

interface Props {
  stats: Stat[];
}

export function StatGrid({ stats }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-6">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl px-5 py-[18px]"
        >
          <div className="font-semibold text-[12px] text-[var(--muted)] uppercase tracking-wide">
            {stat.label}
          </div>
          <div
            className={
              "font-heading text-[34px] leading-none mt-1 " +
              (stat.valueColor === "hot"
                ? "text-[var(--hot)]"
                : stat.valueColor === "accent"
                  ? "text-[var(--accent)]"
                  : "text-[var(--foreground)]")
            }
          >
            {stat.value}
          </div>
          <div className="text-[12px] text-[var(--muted)] mt-1.5 flex items-center gap-1.5">
            {stat.sub}
            {stat.trend && (
              <span
                className={
                  "font-semibold " +
                  (stat.trend.direction === "up"
                    ? "text-[var(--accent)]"
                    : "text-[var(--hot)]")
                }
              >
                {stat.trend.direction === "up" ? "▲" : "▼"} {stat.trend.value}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
