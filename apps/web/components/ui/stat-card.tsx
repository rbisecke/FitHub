import { cn } from "@/lib/utils";

// Builds an SVG polyline path for a sparkline, normalized into a w×h box.
// Exported for unit testing.
export function sparklinePath(points: number[], w: number, h: number): string {
  if (points.length < 2) return "";
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  return points
    .map((p, i) => {
      const x = (i * step).toFixed(1);
      const y = (h - ((p - min) / range) * h).toFixed(1);
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  // Full-width, fixed-height box; path stretches horizontally to fill the card.
  const w = 100;
  const h = 24;
  const d = sparklinePath(points, w, h);
  if (!d) return null;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className="h-6 w-full"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export interface StatDelta {
  /** Text shown next to the arrow, e.g. "+5 kg" or "+2 wks". */
  label: string;
  direction: "up" | "down" | "flat";
  /** Color semantics — decoupled from arrow direction (up isn't always good). */
  tone: "positive" | "negative" | "neutral";
}

const ARROW: Record<StatDelta["direction"], string> = {
  up: "▲",
  down: "▼",
  flat: "→",
};

const TONE_CLASS: Record<StatDelta["tone"], string> = {
  positive: "text-[--green]",
  negative: "text-[--red]",
  neutral: "text-[--muted]",
};

export interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: StatDelta;
  /** Optional trend sparkline values (oldest → newest). */
  spark?: number[];
  /** Sparkline stroke; defaults to the accent token. */
  sparkColor?: string;
  className?: string;
  ariaLabel?: string;
}

/**
 * Metric-as-hero card: big mono numeral + optional colored delta + optional
 * sparkline (design 08 §4). State, trend, and magnitude at a glance.
 */
export function StatCard({
  label,
  value,
  unit,
  delta,
  spark,
  sparkColor = "var(--accent)",
  className,
  ariaLabel,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-[--border] bg-[--surface] p-4",
        className,
      )}
      aria-label={ariaLabel}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-[--muted]">
        {label}
      </p>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-2xl font-bold tabular-nums text-[--text] leading-none">
          {value}
        </span>
        {unit && (
          <span className="font-mono text-xs text-[--muted]">{unit}</span>
        )}
      </div>
      {delta && (
        <p
          className={cn(
            "mt-1.5 font-mono text-xs tabular-nums whitespace-nowrap",
            TONE_CLASS[delta.tone],
          )}
        >
          {ARROW[delta.direction]} {delta.label}
        </p>
      )}
      {spark && spark.length >= 2 && (
        <div className="mt-2">
          <Sparkline points={spark} color={sparkColor} />
        </div>
      )}
    </div>
  );
}
