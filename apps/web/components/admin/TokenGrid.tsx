interface TokenTotals {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

interface Props {
  totals: TokenTotals | null;
}

interface TokenTypeCard {
  label: string;
  color: string;
  value: number;
  total: number;
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function TokenGrid({ totals }: Props) {
  const t: TokenTotals = totals ?? {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
  };
  const total = t.input + t.output + t.cacheRead + t.cacheWrite;

  const cards: TokenTypeCard[] = [
    { label: "Input tokens", color: "#58a6ff", value: t.input, total },
    { label: "Output tokens", color: "#4ADE80", value: t.output, total },
    { label: "Cache read", color: "#FFC83D", value: t.cacheRead, total },
    { label: "Cache write", color: "#FF7A45", value: t.cacheWrite, total },
  ];

  return (
    <div>
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
            Token breakdown
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "#8b949e",
              marginTop: 2,
              fontFamily: "var(--font-jetbrains-mono), monospace",
            }}
          >
            Cumulative · last 30 days
          </div>
        </div>
        {total > 0 && (
          <div
            style={{
              fontFamily: "var(--font-archivo-black), sans-serif",
              fontSize: 18,
              color: "#e6edf3",
            }}
          >
            {fmtTokens(total)}
          </div>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 13,
        }}
      >
        {cards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "#21262d",
              border: "1px solid #30363d",
              borderRadius: 12,
              padding: 15,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 9,
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 2,
                  background: card.color,
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 11.5,
                  color: "#8b949e",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                }}
              >
                {card.label}
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-archivo-black), sans-serif",
                fontSize: 22,
                color: "#e6edf3",
              }}
            >
              {fmtTokens(card.value)}
            </div>
            <div
              style={{
                fontSize: 10.5,
                color: "#8b949e",
                marginTop: 3,
                fontFamily: "var(--font-jetbrains-mono), monospace",
              }}
            >
              {total > 0
                ? `${Math.round((card.value / total) * 100)}% of total`
                : "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
