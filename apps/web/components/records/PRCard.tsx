import Link from "next/link";
import type { PersonalRecord, E1RMPoint } from "@/lib/api";
import type { PRCategory } from "@/lib/records/categorise";
import { formatWeight, formatWeightDelta } from "@/lib/display";

// Category accent colors
const CAT_COLOR: Record<PRCategory, string> = {
  strength: "var(--accent)",
  gymnastics: "var(--purple)",
  metcon: "var(--amber)",
  endurance: "var(--green)",
};

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(y, m - 1, d);
}

function relativeDate(isoDate: string): string {
  const d = parseLocalDate(isoDate);
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

function weeksAgoLabel(isoDate: string): string {
  const d = parseLocalDate(isoDate);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const weeks = Math.floor(diffDays / 7);
  return `${weeks}w ago`;
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
  weightUnit?: string;
  onCalcOpen?: () => void;
}

export function PRCard({
  pr,
  points,
  isRecent,
  category,
  weightUnit = "kg",
  onCalcOpen,
}: Props) {
  const sortedPoints = [...points].sort((a, b) => a.day.localeCompare(b.day));
  const catColor = CAT_COLOR[category];
  const sparklinePts = computeSparkline(sortedPoints, 120, 34);
  const sparklinePtsMobile = computeSparkline(sortedPoints, 90, 24);
  const isImperial = weightUnit === "lb";
  const unit = isImperial ? "lb" : "kg";

  // Improvement badge: use server-computed delta_kg when available; fall back to sparkline approximation.
  // Design decision: delta_kg is null for first PRs (no prior best), so we show "First PR" in that case.
  let improvement: string | null = null;
  let isFirstPR = false;
  if (pr.delta_kg != null) {
    if (pr.delta_kg > 0.01) {
      improvement = `↑ ${formatWeightDelta(pr.delta_kg, unit)} vs prev PR`;
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
      improvement = `↑ ${formatWeightDelta(delta, unit)} vs prev PR`;
    }
  }

  const dateLabel = relativeDate(pr.achieved_at);
  const isToday = dateLabel === "Today";

  const tagHref = `/log/tag?movement_id=${pr.movement_id}`;
  const detailHref = `/records/${pr.movement_id}`;

  // Strength intelligence: new fields from the API
  const hasStrengthIntel = pr.current_e1rm_kg != null;
  const hasTrend = pr.next_pr_kg != null && pr.next_pr_weeks != null;

  return (
    <>
      {/* Mobile compact card — body taps to detail page; corner $ tag goes to log */}
      <div className="md:hidden relative">
        <Link
          href={detailHref}
          aria-label={`View ${pr.movement_name} detail`}
          className={`flex flex-col rounded-[14px] p-[14px] transition-colors active:brightness-90 ${
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
            {isImperial
              ? Math.round(pr.best_1rm_kg * 2.20462)
              : pr.best_1rm_kg.toFixed(1)}
            <span
              className="text-[13px] ml-1"
              style={{ color: "var(--muted)" }}
            >
              {unit}
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
          {/* Strength intelligence lines — mobile */}
          {hasStrengthIntel && (
            <div className="mt-[4px] space-y-[2px]">
              <div className="flex items-center gap-1">
                <span
                  className="font-mono tabular-nums"
                  style={{ fontSize: 10, color: "var(--blue)" }}
                >
                  est. now — {formatWeight(pr.current_e1rm_kg!, unit)}
                </span>
                {pr.is_stale && (
                  <span
                    className="font-mono"
                    style={{ fontSize: 9, color: "var(--muted)" }}
                  >
                    · last logged {weeksAgoLabel(pr.achieved_at)}
                  </span>
                )}
              </div>
              {hasTrend && (
                <div
                  className="font-mono italic"
                  style={{ fontSize: 9, color: "var(--muted)" }}
                >
                  on trend → {formatWeight(pr.next_pr_kg!, unit)} in ~
                  {pr.next_pr_weeks}wk
                </div>
              )}
            </div>
          )}
          {!hasStrengthIntel && (
            <div
              className="font-mono mt-[4px]"
              style={{ fontSize: 9, color: "var(--muted)" }}
            >
              log 3+ sets to unlock trend
            </div>
          )}
          <div className="font-data text-[9.5px] text-[var(--muted)] mt-[4px]">
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
        {/* % calc button — left of $ tag */}
        {onCalcOpen && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onCalcOpen();
            }}
            aria-label={`Open load calculator for ${pr.movement_name}`}
            className="absolute bottom-[10px] right-[58px] font-mono text-[9px] font-semibold px-[12px] min-w-[32px] min-h-[44px] flex items-center justify-center rounded border border-[var(--border)] text-[var(--muted)] active:border-[var(--accent)] active:text-[var(--accent)]"
          >
            %
          </button>
        )}
        {/* $ tag button — absolute in corner, separate from the body link */}
        <Link
          href={tagHref}
          aria-label={`Log new attempt for ${pr.movement_name}`}
          className="absolute bottom-[10px] right-[10px] font-mono text-[9px] font-semibold px-[6px] min-h-[44px] flex items-center rounded border border-[var(--border)] text-[var(--muted)] active:border-[var(--blue)] active:text-[var(--blue)]"
        >
          $ tag
        </Link>
      </div>

      {/* Desktop card — body taps to detail page; hover reveals $ tag button */}
      <article
        className="group hidden md:block relative overflow-hidden bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--blue)] transition-colors"
        aria-label={`${pr.movement_name} personal record: ${formatWeight(
          pr.best_1rm_kg,
          unit,
        )}`}
      >
        {/* TODAY ribbon */}
        {isToday && (
          <div
            className="absolute top-[13px] right-[-32px] rotate-45 text-[var(--bg)] text-[9px] font-extrabold tracking-[1.5px] py-[3px] px-9"
            style={{ background: "var(--accent)" }}
            aria-label="Set today"
          >
            TODAY
          </div>
        )}

        {/* Card body — tappable link to detail page */}
        <Link
          href={detailHref}
          className="block"
          tabIndex={-1}
          aria-hidden="true"
        >
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
            className="font-heading leading-none mb-2"
            style={{ fontSize: "42px", color: "var(--gold)" }}
          >
            {isImperial
              ? Math.round(pr.best_1rm_kg * 2.20462)
              : pr.best_1rm_kg.toFixed(1)}
            <span className="text-[20px] ml-1.5 text-[var(--muted)]">
              {unit}
            </span>
          </p>

          {/* Strength intelligence section — secondary to the gold hero */}
          {hasStrengthIntel ? (
            <div className="mb-2 space-y-[3px]">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-mono tabular-nums text-[12px]"
                  style={{ color: "var(--blue)" }}
                >
                  est. now — {formatWeight(pr.current_e1rm_kg!, unit)}
                </span>
                {pr.is_stale && (
                  <span className="font-mono text-[10px] text-[var(--muted)]">
                    last logged {weeksAgoLabel(pr.achieved_at)}
                  </span>
                )}
              </div>
              {hasTrend && (
                <p className="font-mono italic text-[11px] text-[var(--muted)]">
                  on trend → {formatWeight(pr.next_pr_kg!, unit)} in ~
                  {pr.next_pr_weeks}wk
                </p>
              )}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-[var(--muted)] mb-2">
              log 3+ sets to unlock trend
            </p>
          )}

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
        </Link>

        {/* % calc button — appears on hover, left of $ tag */}
        {onCalcOpen && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCalcOpen();
            }}
            aria-label={`Open load calculator for ${pr.movement_name}`}
            className={[
              "absolute bottom-4 right-[84px]",
              "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
              "flex items-center gap-1 px-2.5 py-1",
              "font-mono text-[11px] font-semibold",
              "rounded-md border border-[var(--accent)] text-[var(--accent)]",
              "hover:bg-[var(--accent)] hover:text-[var(--bg)]",
              "transition-all duration-150",
              "motion-reduce:transition-none",
            ].join(" ")}
          >
            %
          </button>
        )}
        {/* $ tag button — appears on hover, bottom-right */}
        <Link
          href={tagHref}
          aria-label={`Log new attempt for ${pr.movement_name}`}
          onClick={(e) => e.stopPropagation()}
          className={[
            "absolute bottom-4 right-4",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            "flex items-center gap-1 px-2.5 py-1",
            "font-mono text-[11px] font-semibold",
            "rounded-md border border-[var(--blue)] text-[var(--blue)]",
            "hover:bg-[var(--blue)] hover:text-[var(--bg)]",
            "transition-all duration-150",
            "motion-reduce:transition-none",
          ].join(" ")}
        >
          $ tag
        </Link>
      </article>
    </>
  );
}
