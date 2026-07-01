import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import type { PRCategory } from "@/lib/records/categorise";

// Category accent colors
const CAT_COLOR: Record<PRCategory, string> = {
  strength: "#58a6ff",
  gymnastics: "#bc8cff",
  metcon: "#FF7A45",
  endurance: "#4ADE80",
};

function relativeDate(isoDate: string): string {
  const d = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

function computeSparkline(points: E1RMPoint[]): string {
  if (points.length < 2) return "";
  const values = points.map((p) => p.estimated_1rm_kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 120;
  const H = 34;
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * W;
      const y = H - ((p.estimated_1rm_kg - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

interface Props {
  pr: PersonalRecord;
  points: E1RMPoint[];
  isRecent: boolean;
  category: PRCategory;
}

export function PRCard({ pr, points, isRecent, category }: Props) {
  const sortedPoints = [...points].sort((a, b) => a.day.localeCompare(b.day));
  const catColor = CAT_COLOR[category];
  const sparklinePts = computeSparkline(sortedPoints);

  // Improvement badge: delta from penultimate to latest point
  let improvement: string | null = null;
  if (sortedPoints.length >= 2) {
    const prev = sortedPoints[sortedPoints.length - 2]!.estimated_1rm_kg;
    const curr = sortedPoints[sortedPoints.length - 1]!.estimated_1rm_kg;
    const delta = curr - prev;
    if (delta > 0.01) {
      improvement = `+${delta.toFixed(1)} kg`;
    }
  }

  const dateLabel = relativeDate(pr.achieved_at);
  const isToday = dateLabel === "Today";

  return (
    <article
      className="relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--accent)] transition-colors"
      aria-label={`${
        pr.movement_name
      } personal record: ${pr.best_1rm_kg.toFixed(1)} kg`}
    >
      {/* TODAY ribbon */}
      {isToday && (
        <div
          className="absolute top-[13px] right-[-32px] rotate-45 text-[#0A0D12] text-[9px] font-extrabold tracking-[1.5px] py-[3px] px-9"
          style={{ background: "var(--accent)" }}
          aria-label="Set today"
        >
          TODAY
        </div>
      )}

      {/* Category pill */}
      <div className="flex items-center justify-between mb-3">
        <span
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold rounded-full px-2 py-0.5"
          style={{
            background: `${catColor}1a`,
            color: catColor,
            border: `1px solid ${catColor}40`,
          }}
        >
          {category}
        </span>
        {isRecent && !isToday && (
          <span
            className="text-[10px] font-bold tracking-wide rounded-full px-2 py-0.5 animate-popIn"
            style={{
              background: "rgba(255,200,61,0.14)",
              color: "var(--gold)",
              border: "1px solid rgba(255,200,61,0.3)",
            }}
          >
            NEW PR
          </span>
        )}
        {isToday && (
          <span
            className="text-[10px] font-bold tracking-wide rounded-full px-2 py-0.5 animate-popIn"
            style={{
              background: "rgba(255,200,61,0.14)",
              color: "var(--gold)",
              border: "1px solid rgba(255,200,61,0.3)",
            }}
          >
            NEW PR
          </span>
        )}
      </div>

      {/* Movement name */}
      <p className="text-[14px] font-semibold text-[var(--foreground)] mb-1 truncate">
        {pr.movement_name}
      </p>

      {/* Hero number */}
      <p
        className="font-heading leading-none mb-3"
        style={{ fontSize: "42px", color: "var(--gold)" }}
      >
        {pr.best_1rm_kg.toFixed(1)}
        <span className="text-[20px] ml-1.5 text-[var(--muted)]">kg</span>
      </p>

      {/* Improvement + date row */}
      <div className="flex items-center justify-between mb-3">
        {improvement ? (
          <span className="text-[12px] font-semibold text-[var(--accent)]">
            {improvement}
          </span>
        ) : (
          <span className="text-[12px] text-[var(--muted)]">First PR</span>
        )}
        <span className="text-[12px] text-[var(--muted)]">{dateLabel}</span>
      </div>

      {/* SVG sparkline */}
      {sparklinePts && (
        <svg
          width="100%"
          height="34"
          viewBox="0 0 120 34"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="opacity-70"
        >
          <polyline
            points={sparklinePts}
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </article>
  );
}
