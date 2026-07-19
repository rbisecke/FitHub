import type { BodyRegion } from "@/lib/api/plans";

/**
 * Region glyph icon set (05 §2, plan step 4.14) — a small, independently
 * drawn marker per body region for the injury list/detail cards ONLY. This is
 * deliberately NOT a reuse of the other Effort's Variant B grid-card art
 * (`components/injuries/picker/**`); it shares no code, coordinates, or
 * shapes with that set. One shared silhouette + a per-region marker (position
 * + shape) keeps this a minor supporting element, not a second hero visual.
 *
 * Marker shape encodes the region *family* (redundant with position, so a
 * region is identifiable even at very small sizes):
 *   - circle    → joint (shoulder, knee, hip, ...)
 *   - square    → muscle belly (hamstring, quad, chest, ...)
 *   - triangle  → tendon / soft-tissue (rotator_cuff, achilles, groin, ...)
 *   - diamond   → foot / plantar (arch)
 *   - cross     → other / unspecified
 */

interface MarkerSpec {
  cx: number;
  cy: number;
  shape: "circle" | "square" | "triangle" | "diamond" | "cross";
}

const MARKERS: Record<BodyRegion, MarkerSpec> = {
  // joints
  shoulder: { cx: 15, cy: 8, shape: "circle" },
  knee: { cx: 13.2, cy: 19.4, shape: "circle" },
  hip: { cx: 12.5, cy: 15.2, shape: "circle" },
  lower_back: { cx: 11, cy: 13.5, shape: "circle" },
  wrist: { cx: 17, cy: 17.2, shape: "circle" },
  elbow: { cx: 18.2, cy: 13, shape: "circle" },
  ankle: { cx: 13.4, cy: 22.2, shape: "circle" },
  neck: { cx: 12, cy: 6.2, shape: "circle" },
  // muscle bellies
  hamstring: { cx: 13.8, cy: 18.6, shape: "square" },
  quad: { cx: 12.6, cy: 18.2, shape: "square" },
  calf: { cx: 13.6, cy: 21, shape: "square" },
  glute: { cx: 11.4, cy: 16, shape: "square" },
  upper_back: { cx: 10.4, cy: 10.2, shape: "square" },
  chest: { cx: 13, cy: 9.6, shape: "square" },
  bicep: { cx: 16, cy: 10, shape: "square" },
  tricep: { cx: 16.8, cy: 10.6, shape: "square" },
  lat: { cx: 10, cy: 11.4, shape: "square" },
  // soft tissue / connective
  hip_flexor: { cx: 11.4, cy: 16.4, shape: "triangle" },
  it_band: { cx: 14.4, cy: 18, shape: "triangle" },
  forearm: { cx: 17.4, cy: 15.4, shape: "triangle" },
  rotator_cuff: { cx: 14.6, cy: 7.6, shape: "triangle" },
  patellar_tendon: { cx: 13.4, cy: 19.9, shape: "triangle" },
  lateral_elbow: { cx: 18.7, cy: 12.6, shape: "triangle" },
  medial_elbow: { cx: 17.6, cy: 13.5, shape: "triangle" },
  // foot / plantar
  arch: { cx: 13, cy: 23.1, shape: "diamond" },
  achilles: { cx: 13.3, cy: 22.6, shape: "triangle" },
  shin: { cx: 12.7, cy: 21.1, shape: "square" },
  // joint additions
  groin: { cx: 12.3, cy: 16.6, shape: "triangle" },
  si_joint: { cx: 12.8, cy: 15.5, shape: "triangle" },
  // fallback
  other: { cx: 12, cy: 10, shape: "cross" },
};

function Marker({ spec, color }: { spec: MarkerSpec; color: string }) {
  const { cx, cy, shape } = spec;
  switch (shape) {
    case "circle":
      return <circle cx={cx} cy={cy} r={1.5} fill={color} />;
    case "square":
      return (
        <rect
          x={cx - 1.3}
          y={cy - 1.3}
          width={2.6}
          height={2.6}
          rx={0.4}
          fill={color}
        />
      );
    case "triangle":
      return (
        <polygon
          points={`${cx},${cy - 1.7} ${cx + 1.6},${cy + 1.3} ${cx - 1.6},${
            cy + 1.3
          }`}
          fill={color}
        />
      );
    case "diamond":
      return (
        <polygon
          points={`${cx},${cy - 1.7} ${cx + 1.4},${cy} ${cx},${cy + 1.7} ${
            cx - 1.4
          },${cy}`}
          fill={color}
        />
      );
    case "cross":
      return (
        <g stroke={color} strokeWidth={1.1} strokeLinecap="round">
          <line x1={cx - 1.4} y1={cy - 1.4} x2={cx + 1.4} y2={cy + 1.4} />
          <line x1={cx - 1.4} y1={cy + 1.4} x2={cx + 1.4} y2={cy - 1.4} />
        </g>
      );
    default:
      return null;
  }
}

/**
 * Small region glyph: a simplified front-view body outline with one marker
 * lit up at the injured region. `tone` sets the marker color (defaults to
 * the current status tint via `currentColor`); the outline itself always
 * uses the muted token so it recedes behind the marker.
 */
export function RegionGlyph({
  region,
  size = 20,
  tone = "currentColor",
  className,
}: {
  region: BodyRegion;
  size?: number;
  tone?: string;
  className?: string;
}) {
  const spec = MARKERS[region] ?? MARKERS.other;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 26"
      role="img"
      aria-hidden="true"
      className={className}
    >
      {/* Simplified front-facing silhouette: head, torso, arms, legs. */}
      <g
        stroke="var(--muted)"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.55}
      >
        <circle cx={12} cy={4.2} r={2.1} />
        <line x1={12} y1={6.3} x2={12} y2={15.2} />
        <line x1={12} y1={8} x2={17.6} y2={13.2} />
        <line x1={12} y1={8} x2={6.4} y2={13.2} />
        <line x1={12} y1={15.2} x2={13.6} y2={22.5} />
        <line x1={12} y1={15.2} x2={10.4} y2={22.5} />
      </g>
      <Marker spec={spec} color={tone} />
    </svg>
  );
}
