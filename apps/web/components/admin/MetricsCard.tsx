interface Props {
  label: string;
  value: string;
  unit?: string;
  unitColor?: string;
  valueColor?: string;
  subtext?: string;
  subtextColor?: string;
  trend?: "up" | "down" | "neutral";
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
}: Props) {
  const trendPrefix = trend === "up" ? "▲ " : trend === "down" ? "▼ " : "";
  const resolvedSubtextColor =
    subtextColor ??
    (trend === "up" || trend === "down" ? "#4ADE80" : "#8b949e");

  return (
    <div
      style={{
        background: "#161b22",
        border: "1px solid #30363d",
        borderRadius: 14,
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: "#8b949e",
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
          fontSize: 28,
          marginTop: 6,
          color: valueColor ?? "#e6edf3",
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
              color: unitColor ?? "#8b949e",
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
