interface Props {
  hitRate: number; // 0-1
  totalQueries: number;
}

const R = 52;
const CX = 64;
const CY = 64;
const CIRC = 2 * Math.PI * R; // ~326.73

function fmtPct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function RagDonut({ hitRate, totalQueries }: Props) {
  const arc = CIRC * hitRate;
  const missRate = 1 - hitRate;
  const missArc = CIRC * missRate;

  return (
    <div>
      <div
        style={{
          fontWeight: 700,
          fontSize: 14,
          marginBottom: 3,
          color: "#e6edf3",
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        Cache hit rate
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "#8b949e",
          marginBottom: 18,
          fontFamily: "var(--font-jetbrains-mono), monospace",
        }}
      >
        RAG / prompt cache · last 30d
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* Donut SVG */}
        <svg
          width="128"
          height="128"
          viewBox="0 0 128 128"
          style={{ flexShrink: 0 }}
        >
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="#21262d"
            strokeWidth="16"
          />
          {/* Progress arc */}
          {hitRate > 0 && (
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke="#4ADE80"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${arc} ${CIRC}`}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
          )}
          {/* Center value */}
          <text
            x={CX}
            y={CY + 2}
            fontSize="26"
            fontFamily="var(--font-archivo-black), sans-serif"
            fill="#e6edf3"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {fmtPct(hitRate)}
          </text>
          {/* Center label */}
          <text
            x={CX}
            y={CY + 20}
            fontSize="10"
            fontFamily="JetBrains Mono, monospace"
            fill="#8b949e"
            textAnchor="middle"
          >
            hit rate
          </text>
        </svg>

        {/* Breakdown bars */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 11,
          }}
        >
          {/* Hit row */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11.5,
                marginBottom: 4,
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            >
              <span style={{ color: "#4ADE80" }}>Hit</span>
              <span style={{ fontWeight: 700, color: "#e6edf3" }}>
                {fmtPct(hitRate)}
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "#21262d",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${hitRate * 100}%`,
                  background: "#4ADE80",
                  borderRadius: 4,
                }}
              />
            </div>
          </div>

          {/* Miss row */}
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11.5,
                marginBottom: 4,
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            >
              <span style={{ color: "#8b949e" }}>Miss</span>
              <span style={{ fontWeight: 700, color: "#e6edf3" }}>
                {fmtPct(missRate)}
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: "#21262d",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${(missArc / CIRC) * 100}%`,
                  background: "#FF7A45",
                  borderRadius: 4,
                }}
              />
            </div>
          </div>

          <div
            style={{
              fontSize: 10.5,
              color: "#8b949e",
              lineHeight: 1.5,
              marginTop: 2,
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            {totalQueries.toLocaleString()} total queries
            <br />
            Cached inputs save ~90% of input cost.
          </div>
        </div>
      </div>
    </div>
  );
}
