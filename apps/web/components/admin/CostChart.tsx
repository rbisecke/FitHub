import type { AdminDailyCostPoint } from "@/lib/api";

interface Props {
  data: AdminDailyCostPoint[];
  dailyAvg: number;
}

const LEFT = 34;
const TOP = 10;
const RIGHT = 10;
const BOTTOM = 20;
const CHART_W = 660 - LEFT - RIGHT; // 616
const CHART_H = 200 - TOP - BOTTOM; // 170

function formatCost(n: number): string {
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n >= 0.01) return `${(n * 100).toFixed(1)}¢`;
  return `$${n.toFixed(4)}`;
}

function niceMax(val: number): number {
  if (val === 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(val)));
  return Math.ceil(val / mag) * mag;
}

export function CostChart({ data, dailyAvg }: Props) {
  if (data.length === 0) {
    return (
      <div
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#8b949e",
          fontSize: 13,
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        No cost data yet.
      </div>
    );
  }

  const maxRaw = Math.max(...data.map((d) => d.cost_usd));
  const maxVal = niceMax(maxRaw);

  const n = data.length;
  const gap = Math.max(2, Math.round(CHART_W / n / 8));
  const barW = (CHART_W - gap * (n - 1)) / n;

  // Grid lines at 0, 25, 50, 75, 100% of maxVal
  const gridLevels = [0, 0.25, 0.5, 0.75, 1];

  // X-axis labels: first, middle, last-5, last
  const xLabelIndices = new Set<number>([
    0,
    Math.floor(n / 3),
    Math.floor((2 * n) / 3),
    n - 1,
  ]);

  return (
    <div>
      {/* Card header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "#e6edf3",
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            Daily cost
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "#8b949e",
              marginTop: 2,
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            Last 30 days · USD
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-archivo-black), sans-serif",
              fontSize: 18,
              color: "#e6edf3",
            }}
          >
            {formatCost(dailyAvg)}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: "#8b949e",
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            daily avg
          </div>
        </div>
      </div>

      {/* SVG chart */}
      <svg
        viewBox="0 0 660 200"
        width="100%"
        height="auto"
        style={{ display: "block" }}
      >
        {/* Grid lines */}
        {gridLevels.map((pct, i) => {
          const y = TOP + CHART_H - pct * CHART_H;
          const labelVal = maxVal * pct;
          return (
            <g key={i}>
              <line
                x1={LEFT}
                y1={y}
                x2={660 - RIGHT}
                y2={y}
                stroke="#30363d"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
              <text
                x={LEFT - 4}
                y={y + 3.5}
                fontSize="9"
                fontFamily="JetBrains Mono, monospace"
                fill="#8b949e"
                textAnchor="end"
              >
                {formatCost(labelVal)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const isToday = i === data.length - 1;
          const barH = maxVal > 0 ? (d.cost_usd / maxVal) * CHART_H : 0;
          const x = LEFT + i * (barW + gap);
          const y = TOP + CHART_H - barH;
          return (
            <rect
              key={d.day}
              x={x}
              y={y}
              width={barW}
              height={Math.max(barH, 1)}
              rx="2"
              fill={isToday ? "#4ADE80" : "#2f4055"}
            />
          );
        })}
      </svg>

      {/* X-axis labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#8b949e",
          marginTop: 4,
          paddingLeft: LEFT,
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        {data
          .map((d, i) => ({ d, i }))
          .filter(({ i }) => xLabelIndices.has(i))
          .map(({ d, i }) => (
            <span key={i}>
              {i === data.length - 1 ? "today" : d.day.slice(5) /* MM-DD */}
            </span>
          ))}
      </div>
    </div>
  );
}
