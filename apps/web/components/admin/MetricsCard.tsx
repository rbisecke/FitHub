interface Props {
  label: string;
  value: string;
  unit?: string;
  unitColor?: string;
  valueColor?: string;
  subtext?: string;
  subtextColor?: string;
  trend?: "up" | "down" | "neutral";
  /** Smaller value type size for cards whose value is a longer composite
   * string (e.g. "410ms / 890ms") that would otherwise wrap awkwardly. */
  valueFontSize?: number;
}

export function MetricsCard({
  label,
  value,
  unit,
  unitColor,
  valueColor,
  subtext,
  subtextColor,
  trend,
  valueFontSize = 28,
}: Props) {
  const trendPrefix = trend === "up" ? "▲ " : trend === "down" ? "▼ " : "";
  const resolvedSubtextColor =
    subtextColor ??
    (trend === "up" || trend === "down" ? "var(--green)" : "var(--muted)");

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: "var(--muted-strong)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-archivo-black), sans-serif",
          fontSize: valueFontSize,
          marginTop: 6,
          color: valueColor ?? "var(--text)",
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        {value}
        {unit && (
          <span
            style={{
              fontSize: 14,
              color: unitColor ?? "var(--muted)",
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            {unit}
          </span>
        )}
      </div>
      {subtext && (
        <div
          style={{
            fontSize: 11,
            marginTop: 3,
            color: resolvedSubtextColor,
            fontFamily: "var(--font-jetbrains-mono), monospace",
          }}
        >
          {trendPrefix}
          {subtext}
        </div>
      )}
    </div>
  );
}
