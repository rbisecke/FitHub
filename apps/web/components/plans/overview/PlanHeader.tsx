import type { PlanDetail } from "@/lib/api/plans";
import { PlanGenerationNotice } from "@/components/plans/PlanGenerationNotice";
import { formatShortDate } from "@/lib/plans/dates";
import { resolveArchetypeLabel } from "@/lib/plans/archetypes";

/**
 * Plan header shared by both overview variants (02 §4 layout item 1, §5
 * layout item 1) — title + compact git-metadata row, then the generation
 * banners, then the adaptation-surface band.
 *
 * The adaptation surface (02 §8.2 "Check for changes" control, the
 * adaptation-ready banner, the inline Apply/Dismiss panel) is explicitly
 * OUT OF SCOPE here — this domain effort owns the band's layout slot only.
 * `adaptationSurfaceSlot` is a clearly-named prop so a sibling effort can
 * drop its real banner/panel content in without touching this file's
 * layout. Left empty, it renders nothing.
 */
export function PlanHeader({
  plan,
  adaptationSurfaceSlot,
}: {
  plan: PlanDetail;
  adaptationSurfaceSlot?: React.ReactNode;
}) {
  const archetypeLabel = resolveArchetypeLabel(plan.archetype);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h1 className="font-sans text-2xl font-bold text-[var(--text)]">
          {plan.title}
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-xs tabular-nums text-[var(--muted)]">
          <span style={{ color: "var(--purple)" }}>⎇ {plan.branch_name}</span>
          <span>·</span>
          <span>{archetypeLabel}</span>
          <span>·</span>
          <StatusBadge status={plan.status} />
          <span>·</span>
          <span>
            {formatShortDate(plan.start_date)} –{" "}
            {formatShortDate(plan.end_date)}
          </span>
          <span>·</span>
          <span>{plan.weeks} weeks</span>
        </div>
      </div>

      <PlanGenerationNotice
        generationTier={plan.generation_tier}
        corrections={plan.corrections}
      />

      {/* Adaptation surface — layout slot only, see comment above. */}
      <div data-testid="adaptation-surface-slot">{adaptationSurfaceSlot}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: PlanDetail["status"] }) {
  // "archived"/"draft" exist on the model but no reviewed route writes them
  // today (02 §13 note #9) — rendered so the treatment exists, not assumed
  // reachable in normal use.
  const config: Record<PlanDetail["status"], { label: string; color: string }> =
    {
      active: { label: "active", color: "var(--green)" },
      archived: { label: "merged", color: "var(--accent)" },
      draft: { label: "draft", color: "var(--muted)" },
    };
  const { label, color } = config[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 font-sans text-[10px] font-bold uppercase"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
