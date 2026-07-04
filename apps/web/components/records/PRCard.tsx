import Link from "next/link";
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

function computeSparkline(points: E1RMPoint[], W: number, H: number): string {
  if (points.length < 2) return "";
  const values = points.map((p) => p.estimated_1rm_kg);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
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
  const sparklinePts = computeSparkline(sortedPoints, 120, 34);
  const sparklinePtsMobile = computeSparkline(sortedPoints, 90, 24);

  // Improvement badge: use server-computed delta_kg when available; fall back to sparkline approximation.
  // Design decision: delta_kg is null for first PRs (no prior best), so we show "First PR" in that case.
  let improvement: string | null = null;
  let isFirstPR = false;
  if (pr.delta_kg != null) {
    if (pr.delta_kg > 0.01) {
      improvement = `↑ ${pr.delta_kg.toFixed(1)} kg vs prev PR`;
    } else if (pr.prev_best_1rm_kg == null) {
      isFirstPR = true;
    }
  } else if (pr.prev_best_1rm_kg == null) {
    // No previous best — genuinely the first PR for this movement
    isFirstPR = true;
  } else if (sortedPoints.length >= 2) {
    // Fallback: approximate from sparkline when server didn't return delta_kg
    const prev = sortedPoints[sortedPoints.length - 2]!.estimated_1rm_kg;
    const curr = sortedPoints[sortedPoints.length - 1]!.estimated_1rm_kg;
    const delta = curr - prev;
    if (delta > 0.01) {
      improvement = `↑ ${delta.toFixed(1)} kg vs prev PR`;
    }
  }

  const dateLabel = relativeDate(pr.achieved_at);
  const isToday = dateLabel === "Today";

  const tagHref = `/log/tag?movement_id=${pr.movement_id}`;

  return (
    <>
      {/* Mobile compact card — full card is tappable */}
      <Link
        href={tagHref}
        aria-label={`Log new attempt for ${pr.movement_name}`}
        className={`md:hidden relative flex flex-col rounded-[14px] p-[14px] transition-colors active:brightness-90 ${
          isToday
            ? "border border-[var(--accent)] bg-[var(--card)]"
            : "border border-[var(--border)] bg-[var(--card)] active:border-[var(--blue)]"
        }`}
      >
        {isToday && (
          <span
            className="absolute top-[10px] right-[10px] font-data"
            style={{ fontSize: 9, color: "var(--accent)" }}
          >
            ● today
          </span>
        )}
        <div
          className={`font-data text-[11px] text-[var(--muted)] truncate ${
            isToday ? "pr-10" : ""
          }`}
        >
          {pr.movement_name}
        </div>
        <div
          className="font-heading leading-none mt-[3px]"
          style={{ fontSize: "26px", color: "var(--gold)" }}
        >
          {pr.best_1rm_kg.toFixed(1)}
          <span className="text-[13px] ml-1" style={{ color: "var(--muted)" }}>
            kg
          </span>
        </div>
        {sparklinePtsMobile && (
          <svg
            viewBox="0 0 90 24"
            width="100%"
            height="24"
            className="my-[8px]"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <polyline
              points={sparklinePtsMobile}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        <div className="font-data text-[9.5px] text-[var(--muted)]">
          {dateLabel}
          {improvement && (
            <>
              {" "}
              <span style={{ color: "var(--blue)" }}>{improvement}</span>
            </>
          )}
          {isFirstPR && !improvement && (
            <>
              {" "}
              <span style={{ color: "var(--muted)" }}>First PR</span>
            </>
          )}
        </div>
      </Link>

      {/* Desktop card — hover reveals blue border + $ tag button */}
      <article
        className="group hidden md:block relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--blue)] transition-colors"
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
          {(isRecent || isToday) && (
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
            <span
              className="font-mono text-[12px] font-semibold"
              style={{ color: "var(--blue)" }}
            >
              {improvement}
            </span>
          ) : isFirstPR ? (
            <span className="text-[12px] text-[var(--muted)]">First PR</span>
          ) : (
            <span className="text-[12px] text-[var(--muted)]" />
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

        {/* $ tag button — appears on hover, bottom-right */}
        <Link
          href={tagHref}
          aria-label={`Log new attempt for ${pr.movement_name}`}
          onClick={(e) => e.stopPropagation()}
          className={[
            "absolute bottom-4 right-4",
            "opacity-0 group-hover:opacity-100",
            "flex items-center gap-1 px-2.5 py-1",
            "font-mono text-[11px] font-semibold",
            "rounded-md border border-[var(--blue)] text-[var(--blue)]",
            "hover:bg-[var(--blue)] hover:text-[var(--bg)]",
            "transition-all duration-150",
            // Respect prefers-reduced-motion
            "motion-reduce:transition-none",
          ].join(" ")}
        >
          $ tag
        </Link>
      </article>
    </>
  );
}
