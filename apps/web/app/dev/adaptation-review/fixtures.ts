// Dev-preview fixtures for the adaptation review flow (design spec §8).
// STUB_ADAPTATION (apps/api/app/ai/adaptation.py) is a single-session,
// single-field-change fixture — not enough to visually exercise every
// change type (§8.5) or the multi-session review flow. This module is a
// realistic, self-contained, multi-session, multi-field-change fixture
// covering every `change` type so the diff renderer can be screenshotted
// meaningfully without a live backend. Not part of the shipping app.

import type {
  AdaptationOut,
  PlannedItemOut,
  PlannedSessionOut,
  PlanDetail,
} from "@/lib/api/plans";
import type { PrerequisiteStatus } from "@/lib/types/plans";

const now = "2026-07-19T12:00:00Z";

export const RICH_ADAPTATION: AdaptationOut = {
  id: "adapt-rich-1",
  plan_id: "plan-1",
  user_id: "dev",
  trigger_type: "high_acwr",
  trigger_data: { acwr: 1.62 },
  status: "proposed",
  rationale:
    "Your acute:chronic workload ratio hit 1.62 this week — above the 1.5 overtraining threshold. Backing off intensity and volume on the heaviest sessions while keeping the rest of the week intact.",
  rejection_reason: null,
  stub: true,
  proposed_at: now,
  merged_at: null,
  rejected_at: null,
  diff_json: [
    {
      session_id: "s1",
      session_title: "Heavy Squat Day",
      scheduled_date: "2026-07-21",
      change: "reduce_intensity",
      load_pct_delta: -10,
      volume_delta_sets: null,
      notes:
        "Back off to 65% 1RM; prioritize movement quality over load this week.",
      item_changes: [
        {
          item_id: "i1",
          movement_name: "Back Squat",
          item_order: 0,
          old_sets: 5,
          old_reps: "5",
          old_load_pct_1rm: 75,
          old_load_kg: 116,
          old_notes: null,
          new_sets: 5,
          new_reps: "5",
          new_load_pct_1rm: 65,
          new_load_kg: 100,
          new_notes: null,
          changed: true,
          removed: false,
        },
        {
          item_id: "i2",
          movement_name: "Romanian Deadlift",
          item_order: 1,
          old_sets: 3,
          old_reps: "8",
          old_load_pct_1rm: 65,
          old_load_kg: 80,
          old_notes: null,
          new_sets: 3,
          new_reps: "8",
          new_load_pct_1rm: 65,
          new_load_kg: 80,
          new_notes: null,
          changed: false,
          removed: false,
        },
      ],
    },
    {
      session_id: "s2",
      session_title: "Saturday Metcon",
      scheduled_date: "2026-07-25",
      change: "reduce_volume",
      load_pct_delta: null,
      volume_delta_sets: -2,
      notes:
        "Two fewer sets of wall balls — same intensity, less total fatigue.",
      item_changes: [
        {
          item_id: "i3",
          movement_name: "Wall Balls",
          item_order: 0,
          old_sets: 5,
          old_reps: "15",
          old_load_pct_1rm: null,
          old_load_kg: null,
          old_notes: null,
          new_sets: 3,
          new_reps: "15",
          new_load_pct_1rm: null,
          new_load_kg: null,
          new_notes: null,
          changed: true,
          removed: false,
        },
        {
          item_id: "i4",
          movement_name: "Row 500m",
          item_order: 1,
          old_sets: 5,
          old_reps: null,
          old_load_pct_1rm: null,
          old_load_kg: null,
          old_notes: null,
          new_sets: 5,
          new_reps: null,
          new_load_pct_1rm: null,
          new_load_kg: null,
          new_notes: null,
          changed: false,
          removed: false,
        },
      ],
    },
    {
      session_id: "s3",
      session_title: "Sunday Recovery",
      scheduled_date: "2026-07-26",
      change: "add_rest",
      load_pct_delta: null,
      volume_delta_sets: null,
      notes: "Adding a full active-recovery day ahead of next week's block.",
      item_changes: [
        {
          item_id: "i5",
          movement_name: "Easy Bike Spin",
          item_order: 0,
          old_sets: 1,
          old_reps: "20min",
          old_load_pct_1rm: null,
          old_load_kg: null,
          old_notes: null,
          new_sets: 1,
          new_reps: "20min",
          new_load_pct_1rm: null,
          new_load_kg: null,
          new_notes: null,
          changed: false,
          removed: false,
        },
      ],
    },
    {
      session_id: "s4",
      session_title: "Thursday Skill Work",
      scheduled_date: "2026-07-24",
      change: "swap_session",
      load_pct_delta: null,
      volume_delta_sets: null,
      notes:
        "Swapping Handstand Push-Ups for a Ring Muscle-Up progression given current shoulder fatigue.",
      item_changes: [
        {
          item_id: "i6",
          movement_name: "Handstand Push-Up",
          item_order: 0,
          old_sets: 4,
          old_reps: "6",
          old_load_pct_1rm: null,
          old_load_kg: null,
          old_notes: null,
          new_sets: null,
          new_reps: null,
          new_load_pct_1rm: null,
          new_load_kg: null,
          new_notes: null,
          changed: true,
          removed: true,
        },
        {
          item_id: null,
          movement_name: "Ring Muscle-Up Progression",
          item_order: 1,
          old_sets: null,
          old_reps: null,
          old_load_pct_1rm: null,
          old_load_kg: null,
          old_notes: null,
          new_sets: 4,
          new_reps: "3",
          new_load_pct_1rm: null,
          new_load_kg: null,
          new_notes: "Banded false-grip pull to chest",
          changed: true,
          removed: false,
        },
        {
          item_id: "i7",
          movement_name: "Toes-to-Bar",
          item_order: 2,
          old_sets: 4,
          old_reps: "10",
          old_load_pct_1rm: null,
          old_load_kg: null,
          old_notes: null,
          new_sets: 4,
          new_reps: "10",
          new_load_pct_1rm: null,
          new_load_kg: null,
          new_notes: null,
          changed: false,
          removed: false,
        },
      ],
    },
    {
      session_id: "s5",
      session_title: "Friday Oly Day",
      scheduled_date: "2026-07-24",
      change: "skip",
      load_pct_delta: null,
      volume_delta_sets: null,
      notes:
        "Skipping this session entirely — two heavy barbell days back-to-back given the current ACWR.",
      item_changes: [],
    },
  ],
};

export const NO_OP_ADAPTATION: AdaptationOut = {
  ...RICH_ADAPTATION,
  id: "adapt-noop-1",
  rationale:
    "Training load looks reasonable this week — nothing needs to change yet.",
  diff_json: [],
};

export const STUB_FLAGGED_ADAPTATION: AdaptationOut = {
  ...RICH_ADAPTATION,
  id: "adapt-stub-1",
  stub: true,
  trigger_type: "low_readiness",
  trigger_data: { streak_days: 4 },
  rationale: "Recovery has been low for 4 consecutive days.",
  diff_json: RICH_ADAPTATION.diff_json?.slice(0, 1) ?? [],
};

// ── Skill-acquisition ladder fixtures (§10) ─────────────────────────────────
//
// Generated from ONE canonical chain (entry-level -> target, matching the
// real backend's SKILL_PREREQUISITES shape) so every demo state agrees on
// rung order — mirrors mapSkillContextToLadder in TargetMovementStep.tsx:
// confirmed prefix -> current_entry_point (first unconfirmed, or the target
// itself once everything is confirmed) -> remaining pending rungs, reversed
// for top-(target)-to-bottom-(entry) display.

const BAR_MUSCLE_UP_CHAIN = [
  "Strict Pull-Up",
  "Chest-to-Bar Pull-Up",
  "Kipping Pull-Up",
  "Kipping Chest-to-Bar Pull-Up",
  "Bar Muscle-Up",
];

function buildLadderFixture(confirmedCount: number): PrerequisiteStatus[] {
  const chain = BAR_MUSCLE_UP_CHAIN;
  const lastIndex = chain.length - 1;
  const currentEntryIndex = Math.min(confirmedCount, lastIndex);
  const items = chain.map((name, i) => ({
    movementId: `${name}-${i}`,
    movementName: name,
    status:
      i === lastIndex
        ? ("target" as const)
        : i < confirmedCount
          ? ("checked" as const)
          : ("pending" as const),
    isCurrent: i === currentEntryIndex,
  }));
  return items.reverse();
}

/** Just started — nothing confirmed yet, "you are here" at the very bottom (easiest) rung. */
export const LADDER_EARLY: PrerequisiteStatus[] = buildLadderFixture(0);

/** Two prerequisites confirmed — "you are here" sits mid-chain. */
export const LADDER_IN_PROGRESS: PrerequisiteStatus[] = buildLadderFixture(2);

/** Every prerequisite confirmed — target rung doubles as "you are here" (design spec §10 "all confirmed" case). */
export const LADDER_ALL_CONFIRMED: PrerequisiteStatus[] = buildLadderFixture(
  BAR_MUSCLE_UP_CHAIN.length - 1,
);

// ── Manual revision (§9) fixtures ───────────────────────────────────────────

function item(overrides: Partial<PlannedItemOut>): PlannedItemOut {
  return {
    id: "item",
    movement_name: "Movement",
    sets: null,
    reps: null,
    load_pct_1rm: null,
    load_kg: null,
    notes: null,
    item_order: 0,
    ...overrides,
  };
}

function session(overrides: Partial<PlannedSessionOut>): PlannedSessionOut {
  return {
    id: "session",
    mesocycle_id: "meso-1",
    scheduled_date: "2026-07-24",
    session_type: "metcon",
    title: "Session",
    notes: null,
    status: "prescribed",
    items: [],
    ...overrides,
  };
}

export const ELIGIBLE_PLAN_DETAIL: PlanDetail = {
  id: "plan-1",
  archetype: "general-crossfit",
  title: "General CrossFit — 8wk",
  branch_name: "plan/general-crossfit-2026-07",
  weeks: 8,
  status: "active",
  start_date: "2026-07-01",
  end_date: "2026-08-26",
  created_at: now,
  training_age: "intermediate",
  mesocycles: [],
  corrections: [],
  sessions: [
    session({
      id: "rev-s1",
      title: "Thursday Metcon",
      scheduled_date: "2026-07-24",
      items: [
        item({ id: "rev-i1", movement_name: "Thrusters", sets: 5, reps: "10" }),
      ],
    }),
  ],
};

export const NO_ELIGIBLE_PLAN_DETAIL: PlanDetail = {
  ...ELIGIBLE_PLAN_DETAIL,
  sessions: [
    session({
      id: "rev-s1",
      title: "Thursday Metcon",
      status: "completed",
      items: [
        item({ id: "rev-i1", movement_name: "Thrusters", sets: 5, reps: "10" }),
      ],
    }),
  ],
};

export const REVISION_BEFORE_SESSIONS: PlannedSessionOut[] = [
  session({
    id: "rev-s1",
    title: "Thursday Metcon",
    scheduled_date: "2026-07-24",
    items: [
      item({ id: "rev-i1", movement_name: "Thrusters", sets: 5, reps: "10" }),
    ],
  }),
];

export const REVISION_AFTER_SESSIONS: PlannedSessionOut[] = [
  session({
    id: "rev-s1",
    title: "Thursday Metcon",
    scheduled_date: "2026-07-24",
    items: [
      item({ id: "rev-i2", movement_name: "Row 2000m", sets: 1, reps: null }),
    ],
  }),
];
