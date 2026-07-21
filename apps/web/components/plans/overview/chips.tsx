import type { MesocycleOut, PlannedSessionOut } from "@/lib/api/plans";

/**
 * Session-type and mesocycle-phase chips shared by both overview variants
 * (02 §4, §5) and session detail (§6). Text + subtle tint, never tint-only
 * (Bible accessibility rule). Both chip sets defensively fall back for
 * values the model allows but the live scaffold doesn't emit:
 *  - `conditioning` session_type appears in some fallback templates but not
 *    in `PlannedSessionOut.session_type`'s Literal (02 §13 item 9) — falls
 *    back to a generic "training" chip rather than breaking rendering.
 *  - `peak`/`test` mesocycle phases are valid but fallback-tier-only (02
 *    §11) — rendered like any other phase, just rare in practice.
 */

type SessionType = PlannedSessionOut["session_type"];
type MesoPhase = MesocycleOut["phase"];

const SESSION_TYPE_LABEL: Record<SessionType, string> = {
  strength: "Strength",
  metcon: "Metcon",
  skill: "Skill",
  mixed: "Mixed",
  rest: "Rest",
  active_recovery: "Active Recovery",
};

const SESSION_TYPE_COLOR: Record<SessionType, string> = {
  strength: "var(--accent)",
  metcon: "var(--amber)",
  skill: "var(--green)",
  mixed: "var(--purple)",
  rest: "var(--muted)",
  active_recovery: "var(--green)",
};

/** Resolve an arbitrary session_type string (including unknown fallback
 * values like "conditioning") to a display label + color, never throwing. */
export function resolveSessionTypeChip(sessionType: string): {
  label: string;
  color: string;
} {
  const known = SESSION_TYPE_LABEL[sessionType as SessionType];
  if (known) {
    return {
      label: known,
      color: SESSION_TYPE_COLOR[sessionType as SessionType],
    };
  }
  // Unknown/unreachable-in-schema value (e.g. a fallback template's
  // "conditioning") — degrade to a generic chip instead of breaking.
  return { label: "Training", color: "var(--muted)" };
}

export function SessionTypeChip({ sessionType }: { sessionType: string }) {
  const { label, color } = resolveSessionTypeChip(sessionType);
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.04em]"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}

const PHASE_LABEL: Record<MesoPhase, string> = {
  accumulation: "Accumulation",
  intensification: "Intensification",
  realization: "Realization",
  deload: "Deload",
  peak: "Peak",
  test: "Test",
};

const PHASE_COLOR: Record<MesoPhase, string> = {
  accumulation: "var(--green)",
  intensification: "var(--amber)",
  realization: "var(--red)",
  deload: "var(--purple)",
  peak: "var(--accent)",
  test: "var(--accent)",
};

export function resolvePhaseChip(phase: string | null | undefined): {
  label: string;
  color: string;
} {
  const known = PHASE_LABEL[phase as MesoPhase];
  if (known) return { label: known, color: PHASE_COLOR[phase as MesoPhase] };
  return { label: phase ?? "Phase", color: "var(--muted)" };
}

export function PhaseChip({ phase }: { phase: string | null | undefined }) {
  const { label, color } = resolvePhaseChip(phase);
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-[0.04em]"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 32%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
