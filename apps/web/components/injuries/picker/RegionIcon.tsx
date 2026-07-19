import type { BodyRegion } from "./taxonomy";

type IconKind = "joint" | "torso" | "capsule" | "other";

interface IconSpec {
  kind: IconKind;
  /** Capsule rotation in degrees (0 = vertical). */
  rotate?: number;
  dot: { x: number; y: number };
}

/**
 * Data-driven shape lookup for Variant B's mini region icons (05 §1.1,
 * "SimpleTherapy grid of mini-diagrams"). One small line-art illustration
 * per region: a joint (circle outline), a limb segment (capsule), or a torso
 * panel (rounded rect), each with a single accent dot at the target zone.
 * Parameterized into data rather than 30 hand-authored SVG files, per the
 * spec's own "don't hand-author 30 separate files" instruction — consistency
 * of stroke width and dot treatment matters more than per-region detail.
 */
const ICON_SPEC: Record<BodyRegion, IconSpec> = {
  shoulder: { kind: "joint", dot: { x: 24, y: 16 } },
  knee: { kind: "joint", dot: { x: 24, y: 24 } },
  hip: { kind: "joint", dot: { x: 24, y: 20 } },
  wrist: { kind: "joint", dot: { x: 24, y: 24 } },
  elbow: { kind: "joint", dot: { x: 24, y: 24 } },
  ankle: { kind: "joint", dot: { x: 24, y: 28 } },
  neck: { kind: "joint", dot: { x: 24, y: 16 } },
  lower_back: { kind: "torso", dot: { x: 24, y: 30 } },
  si_joint: { kind: "torso", dot: { x: 30, y: 28 } },
  groin: { kind: "torso", dot: { x: 24, y: 34 } },
  chest: { kind: "torso", dot: { x: 24, y: 18 } },
  upper_back: { kind: "torso", dot: { x: 24, y: 16 } },
  hamstring: { kind: "capsule", rotate: 0, dot: { x: 24, y: 30 } },
  quad: { kind: "capsule", rotate: 0, dot: { x: 24, y: 18 } },
  calf: { kind: "capsule", rotate: 0, dot: { x: 24, y: 28 } },
  glute: { kind: "capsule", rotate: 0, dot: { x: 24, y: 18 } },
  bicep: { kind: "capsule", rotate: 0, dot: { x: 24, y: 16 } },
  tricep: { kind: "capsule", rotate: 0, dot: { x: 24, y: 16 } },
  lat: { kind: "capsule", rotate: 20, dot: { x: 28, y: 20 } },
  hip_flexor: { kind: "capsule", rotate: -15, dot: { x: 20, y: 20 } },
  it_band: { kind: "capsule", rotate: 8, dot: { x: 26, y: 24 } },
  forearm: { kind: "capsule", rotate: 0, dot: { x: 24, y: 26 } },
  rotator_cuff: { kind: "joint", dot: { x: 30, y: 18 } },
  patellar_tendon: { kind: "capsule", rotate: 0, dot: { x: 24, y: 30 } },
  lateral_elbow: { kind: "joint", dot: { x: 16, y: 24 } },
  medial_elbow: { kind: "joint", dot: { x: 32, y: 24 } },
  arch: { kind: "torso", dot: { x: 24, y: 30 } },
  achilles: { kind: "capsule", rotate: 0, dot: { x: 24, y: 32 } },
  shin: { kind: "capsule", rotate: 0, dot: { x: 24, y: 20 } },
  other: { kind: "other", dot: { x: 24, y: 24 } },
};

export function RegionIcon({
  region,
  color = "var(--muted)",
}: {
  region: BodyRegion;
  color?: string;
}) {
  const spec = ICON_SPEC[region];
  return (
    <svg viewBox="0 0 48 48" className="h-8 w-8" aria-hidden="true">
      {spec.kind === "joint" && (
        <circle
          cx={24}
          cy={24}
          r={13}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
      )}
      {spec.kind === "torso" && (
        <rect
          x={8}
          y={10}
          width={32}
          height={28}
          rx={8}
          fill="none"
          stroke={color}
          strokeWidth={2}
        />
      )}
      {spec.kind === "capsule" && (
        <rect
          x={17}
          y={6}
          width={14}
          height={36}
          rx={7}
          fill="none"
          stroke={color}
          strokeWidth={2}
          transform={`rotate(${spec.rotate ?? 0} 24 24)`}
        />
      )}
      {spec.kind === "other" && (
        <>
          <circle
            cx={24}
            cy={24}
            r={13}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeDasharray="3 3"
          />
          <text
            x={24}
            y={29}
            textAnchor="middle"
            fontSize={14}
            fill={color}
            fontFamily="monospace"
          >
            ?
          </text>
        </>
      )}
      {spec.kind !== "other" && (
        <circle cx={spec.dot.x} cy={spec.dot.y} r={3} fill={color} />
      )}
    </svg>
  );
}
