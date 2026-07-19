"use client";

import type { BodyRegion } from "./taxonomy";
import { REGION_DISPLAY_NAME } from "./taxonomy";
import type { Side } from "./geometry";
import {
  VIEW_BOX,
  detailedShapesForSide,
  groupingShapeD,
  groupingShapesForSide,
  insetClusterFor,
  shapePathD,
  standardShapesForSide,
} from "./geometry";

type Tier = "standard" | "detailed";
type Severity = "amber" | "red";

/**
 * One front/back silhouette render (05 §1.1). Each selectable region is an
 * SVG `<path>` with `id="{enum_value}"` and an `aria-label` naming the
 * plain-English region — a first-class named control, not a screen-reader
 * dead zone, independent of the shared search-list fallback.
 */
export function BodySilhouette({
  side,
  tier,
  selected,
  severity,
  alreadyLoggedRegions,
  pulsingRegions,
  prefersReducedMotion,
  onSelectRegion,
  onTapGrouping,
  onRequestInset,
}: {
  side: Side;
  tier: Tier;
  selected: BodyRegion | null;
  severity: Severity;
  alreadyLoggedRegions: readonly BodyRegion[];
  pulsingRegions: readonly BodyRegion[];
  prefersReducedMotion: boolean;
  onSelectRegion: (region: BodyRegion) => void;
  onTapGrouping: (groupingId: string) => void;
  onRequestInset: (region: BodyRegion) => void;
}) {
  const regionShapes =
    tier === "standard"
      ? standardShapesForSide(side)
      : detailedShapesForSide(side);
  const groupingShapes = tier === "standard" ? groupingShapesForSide(side) : [];
  const alreadyLogged = new Set(alreadyLoggedRegions);
  const pulsing = new Set(pulsingRegions);
  const glowColor = severity === "red" ? "var(--red)" : "var(--amber)";

  function handleTap(region: BodyRegion) {
    if (tier === "detailed" && insetClusterFor(side, region)) {
      onRequestInset(region);
      return;
    }
    onSelectRegion(region);
  }

  return (
    <svg
      viewBox={VIEW_BOX}
      role="group"
      aria-label={`Body silhouette — ${side} view, ${tier} tier`}
      className="h-auto w-full max-w-[280px]"
    >
      {/* Decorative head — not a tappable region. */}
      <circle cx={100} cy={20} r={16} fill="var(--border)" opacity={0.35} />

      {groupingShapes.map((shape) => (
        <path
          key={shape.id}
          id={shape.id}
          data-region-group={shape.key}
          role="button"
          tabIndex={0}
          aria-label={`${
            shape.key === "upper_arm_group" ? "Upper arm" : "Foot & lower leg"
          } — choose a specific part`}
          d={groupingShapeD(shape)}
          fill="var(--border)"
          fillOpacity={0.28}
          stroke="var(--border)"
          strokeWidth={1}
          className="cursor-pointer outline-none focus-visible:stroke-[var(--accent)] focus-visible:stroke-2"
          onClick={() => onTapGrouping(shape.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTapGrouping(shape.id);
            }
          }}
        />
      ))}

      {regionShapes.map(({ id, spec }) => {
        const isSelected = selected === id;
        const isAlreadyLogged = alreadyLogged.has(id);
        const isPulsing = pulsing.has(id) && !prefersReducedMotion;
        const isStaticHighlight = pulsing.has(id) && prefersReducedMotion;
        return (
          <path
            key={id}
            id={id}
            role="button"
            tabIndex={0}
            aria-label={REGION_DISPLAY_NAME[id]}
            aria-pressed={isSelected}
            d={shapePathD(spec)}
            fill={
              isSelected
                ? glowColor
                : isStaticHighlight
                  ? "var(--accent)"
                  : "var(--border)"
            }
            fillOpacity={
              isSelected
                ? 0.55
                : isAlreadyLogged
                  ? 0.12
                  : isStaticHighlight
                    ? 0.4
                    : 0.22
            }
            stroke={isSelected ? glowColor : "var(--border)"}
            strokeWidth={isSelected ? 2 : 1}
            className={`cursor-pointer outline-none focus-visible:stroke-[var(--accent)] focus-visible:stroke-2 ${
              isPulsing ? "region-pulse" : ""
            }`}
            onClick={() => handleTap(id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleTap(id);
              }
            }}
          >
            {isAlreadyLogged && !isSelected && (
              <title>{`${REGION_DISPLAY_NAME[id]} — already logged`}</title>
            )}
          </path>
        );
      })}

      <style>{`
        @keyframes region-pulse-kf {
          0% { opacity: 0.6; }
          50% { opacity: 1; }
          100% { opacity: 0.6; }
        }
        .region-pulse {
          animation: region-pulse-kf 400ms ease-in-out;
        }
      `}</style>
    </svg>
  );
}
