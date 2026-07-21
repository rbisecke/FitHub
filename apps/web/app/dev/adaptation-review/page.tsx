"use client";

import { ForcedTheme } from "@/components/shared/forced-theme";
import { AdaptationReviewScreen } from "@/components/adaptations/AdaptationReviewScreen";
import { AdaptationCheckControl } from "@/components/adaptations/AdaptationCheckControl";
import { AdaptationInlinePanel } from "@/components/adaptations/AdaptationInlinePanel";
import { ManualRevisionComposer } from "@/components/adaptations/ManualRevisionComposer";
import { SessionDiffCard } from "@/components/adaptations/SessionDiffCard";
import { PrerequisiteLadder } from "@/components/plans/wizard/PrerequisiteLadder";
import { computeManualRevisionDiff } from "@/lib/adaptationDiff";
import {
  RICH_ADAPTATION,
  NO_OP_ADAPTATION,
  STUB_FLAGGED_ADAPTATION,
  LADDER_EARLY,
  LADDER_IN_PROGRESS,
  LADDER_ALL_CONFIRMED,
  ELIGIBLE_PLAN_DETAIL,
  NO_ELIGIBLE_PLAN_DETAIL,
  REVISION_BEFORE_SESSIONS,
  REVISION_AFTER_SESSIONS,
} from "./fixtures";

const TOKEN = "dev-preview-token";

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b" style={{ borderColor: "var(--border)" }}>
      <div className="px-4 pt-6 pb-2">
        <p
          className="font-mono text-[11px] uppercase tracking-wide"
          style={{ color: "var(--muted)" }}
        >
          {title}
        </p>
        {note && (
          <p
            className="mt-0.5 font-mono text-[11px]"
            style={{ color: "var(--muted)" }}
          >
            {note}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

/**
 * Dev-only preview harness for the adaptation review flow (design spec §8-
 * §10). STUB_ADAPTATION from the real backend is a single-session,
 * single-field fixture — not enough to visually exercise every change type,
 * multi-session review, or the mobile bottom-sheet verdict bar. Renders the
 * real production components against realistic fixtures instead. Same
 * pattern as `app/dev/injuries-list`. Not part of the shipping app.
 */
export default function DevAdaptationReviewPreview() {
  const revisionDiff = computeManualRevisionDiff(
    REVISION_BEFORE_SESSIONS,
    REVISION_AFTER_SESSIONS,
  );

  return (
    <ForcedTheme
      theme="light"
      className="min-h-svh bg-background text-foreground"
    >
      <div className="flex flex-col">
        <Section
          title="5.31–5.35 — Dedicated review page, multi-session diff"
          note="reduce_intensity + reduce_volume + add_rest + swap_session + skip, plus unchanged context rows"
        >
          <AdaptationReviewScreen
            token={TOKEN}
            planId="plan-1"
            initialAdaptations={[RICH_ADAPTATION]}
            initialLoadFailed={false}
          />
        </Section>

        <Section title="5.36 — No-op proposal (empty diff)">
          <AdaptationReviewScreen
            token={TOKEN}
            planId="plan-1"
            initialAdaptations={[NO_OP_ADAPTATION]}
            initialLoadFailed={false}
          />
        </Section>

        <Section title="5.36 — Empty state (no proposed adaptations)">
          <AdaptationReviewScreen
            token={TOKEN}
            planId="plan-1"
            initialAdaptations={[]}
            initialLoadFailed={false}
          />
        </Section>

        <Section title="5.36 — Load error (also the §13 item 10 defensive state)">
          <AdaptationReviewScreen
            token={TOKEN}
            planId="plan-1"
            initialAdaptations={null}
            initialLoadFailed={true}
          />
        </Section>

        <Section title="5.32 — Single session diff card, stub indicator">
          <div className="p-4">
            <SessionDiffCard
              diff={
                STUB_FLAGGED_ADAPTATION.diff_json?.[0] ??
                RICH_ADAPTATION.diff_json![0]!
              }
              viewed={false}
              onToggleViewed={() => {}}
            />
          </div>
        </Section>

        <Section title="5.30 — Check-for-changes control (no pending proposal)">
          <div className="p-4">
            <AdaptationCheckControl
              token={TOKEN}
              planId="plan-1"
              reviewHref="/plan/plan-1/adaptations"
              initialAdaptations={[]}
            />
          </div>
        </Section>

        <Section title="5.30 — Announcement banner (duplicate-guard state, pending proposal exists)">
          <div className="p-4">
            <AdaptationCheckControl
              token={TOKEN}
              planId="plan-1"
              reviewHref="/plan/plan-1/adaptations"
              initialAdaptations={[RICH_ADAPTATION]}
            />
          </div>
        </Section>

        <Section title="5.37 — Inline adaptation panel (plan-overview placeholder band)">
          <div className="p-4">
            <AdaptationInlinePanel
              token={TOKEN}
              planId="plan-1"
              reviewHref="/plan/plan-1/adaptations"
              initialAdaptations={[RICH_ADAPTATION]}
            />
          </div>
        </Section>

        <Section title="5.38 — Manual revision composer, eligible plan">
          <div className="p-4">
            <ManualRevisionComposer
              token={TOKEN}
              planId="plan-1"
              initialPlanDetail={ELIGIBLE_PLAN_DETAIL}
            />
          </div>
        </Section>

        <Section title="5.38 — No eligible sessions (422 pre-check state)">
          <div className="p-4">
            <ManualRevisionComposer
              token={TOKEN}
              planId="plan-1"
              initialPlanDetail={NO_ELIGIBLE_PLAN_DETAIL}
            />
          </div>
        </Section>

        <Section
          title="5.38 — Applied diff result (already-applied, read-only — no Viewed checklist)"
          note="reuses the §8.5 diff renderer, presented as a done deal per §9"
        >
          <div className="flex flex-col gap-3 p-4">
            {revisionDiff.map((diff) => (
              <SessionDiffCard
                key={diff.session_id}
                diff={diff}
                viewed={true}
                onToggleViewed={() => {}}
                readOnly
              />
            ))}
          </div>
        </Section>

        <Section title="5.40 — Skill-acquisition ladder: early progress, 'you are here'">
          <ForcedTheme theme="dark" className="bg-background p-6">
            <PrerequisiteLadder items={LADDER_EARLY} />
          </ForcedTheme>
        </Section>

        <Section title="5.40 — Skill-acquisition ladder: partial progress">
          <ForcedTheme theme="dark" className="bg-background p-6">
            <PrerequisiteLadder items={LADDER_IN_PROGRESS} />
          </ForcedTheme>
        </Section>

        <Section title="5.40 — Skill-acquisition ladder: all confirmed (target = current entry point)">
          <ForcedTheme theme="dark" className="bg-background p-6">
            <PrerequisiteLadder items={LADDER_ALL_CONFIRMED} />
          </ForcedTheme>
        </Section>

        <Section title="5.40 — Skill-acquisition ladder: empty (no chain / no prerequisites)">
          <ForcedTheme theme="dark" className="bg-background p-6">
            <PrerequisiteLadder items={[]} />
          </ForcedTheme>
        </Section>
      </div>
    </ForcedTheme>
  );
}
