// Shared formatting + diff-computation helpers for the adaptation review flow
// (design spec §8.5) and the manual-revision applied-diff view (§9). Pure
// functions only — no React, no fetching — so both the dedicated review page
// and the dev preview harness can share identical rendering logic.

import type {
  AdaptationItemChange,
  AdaptationSessionDiff,
  PlannedItemOut,
  PlannedSessionOut,
} from "@/lib/api/plans";

/** "5 × 5" — sets/reps pair. Falls back to a single side if only one is known. */
export function formatSetsReps(
  sets: number | null | undefined,
  reps: string | null | undefined,
): string | null {
  if (sets != null && reps) return `${sets} × ${reps}`;
  if (sets != null) return `${sets} sets`;
  if (reps) return reps;
  return null;
}

/**
 * "75% · 102 kg" — the resolved %1RM pairing established in §6, reused
 * symmetrically on both the old and new side of a diff row (§8.5).
 */
export function formatLoad(
  pct: number | null | undefined,
  kg: number | null | undefined,
): string | null {
  const pctStr =
    pct != null ? `${pct % 1 === 0 ? pct : pct.toFixed(1)}%` : null;
  const kgStr = kg != null ? `${kg % 1 === 0 ? kg : kg.toFixed(1)} kg` : null;
  if (pctStr && kgStr) return `${pctStr} · ${kgStr}`;
  return pctStr ?? kgStr;
}

/** A single change-magnitude label for a session's mini-bar (§8.3). */
export function sessionMagnitudeLabel(diff: AdaptationSessionDiff): string {
  const parts: string[] = [];
  if (diff.volume_delta_sets != null && diff.volume_delta_sets !== 0) {
    const sign = diff.volume_delta_sets > 0 ? "+" : "−";
    parts.push(`${sign}${Math.abs(diff.volume_delta_sets)} sets`);
  }
  if (diff.load_pct_delta != null && diff.load_pct_delta !== 0) {
    const sign = diff.load_pct_delta > 0 ? "+" : "−";
    parts.push(`${sign}${Math.abs(diff.load_pct_delta)}% load`);
  }
  if (parts.length === 0) {
    if (diff.change === "add_rest") return "+ rest day";
    if (diff.change === "skip") return "− session removed";
    if (diff.change === "swap_session") return "session swapped";
  }
  return parts.join(" · ") || "modified";
}

export type MagnitudeDirection = "negative" | "positive" | "neutral";

export interface SessionMagnitudeVisual {
  direction: MagnitudeDirection;
  /** 0..1 fraction of the mini-bar's half-width to fill, growing from the center zero-point. */
  fraction: number;
}

/**
 * A static, non-interactive diverging-bar spec for the GitKraken-style
 * magnitude gauge (§8.3): fill grows from a center zero-point, red-left for
 * reductions / green-right for additions — never a rounded "thumb," which
 * reads as a draggable slider rather than a data readout.
 */
export function sessionMagnitudeVisual(
  diff: AdaptationSessionDiff,
): SessionMagnitudeVisual {
  if (diff.change === "skip") return { direction: "negative", fraction: 1 };
  if (diff.change === "add_rest") return { direction: "positive", fraction: 1 };
  if (diff.change === "swap_session")
    return { direction: "neutral", fraction: 1 };

  const pct = Math.abs(diff.load_pct_delta ?? 0) / 100;
  const sets = Math.abs(diff.volume_delta_sets ?? 0) / 10;
  const fraction = Math.max(0.25, Math.min(1, Math.max(pct, sets)));
  const isNegative =
    (diff.load_pct_delta ?? 0) < 0 || (diff.volume_delta_sets ?? 0) < 0;
  return { direction: isNegative ? "negative" : "positive", fraction };
}

export interface AdaptationMagnitudeSummary {
  sessionsChanged: number;
  volumeDeltaSets: number;
  label: string;
}

/** Header "N sessions changed · volume delta" readout (§8.3 item 1). */
export function summarizeAdaptationMagnitude(
  diffs: AdaptationSessionDiff[],
): AdaptationMagnitudeSummary {
  const sessionsChanged = diffs.length;
  const volumeDeltaSets = diffs.reduce(
    (sum, d) => sum + (d.volume_delta_sets ?? 0),
    0,
  );
  const intensityReduced = diffs.filter(
    (d) => d.change === "reduce_intensity",
  ).length;

  const bits: string[] = [
    `${sessionsChanged} session${sessionsChanged === 1 ? "" : "s"} changed`,
  ];
  if (volumeDeltaSets !== 0) {
    const sign = volumeDeltaSets > 0 ? "+" : "−";
    bits.push(`${sign}${Math.abs(volumeDeltaSets)} sets`);
  }
  if (intensityReduced > 0) {
    bits.push(
      `${intensityReduced} session${
        intensityReduced === 1 ? "" : "s"
      } intensity reduced`,
    );
  }

  return { sessionsChanged, volumeDeltaSets, label: bits.join(" · ") };
}

// ── Manual-revision client-side diff reconstruction (design spec §9) ───────
//
// POST /plans/{id}/revise applies the LLM's patch immediately and returns the
// updated PlanDetail — it does not return an old/new diff (that shape only
// exists for the AI-adaptation path, per §8.1's backend extension). To honor
// §9's "show the result as an already-applied diff, reusing the §8.5
// rendering component" requirement without a backend change, the composer
// snapshots the plan's prescribed sessions before submitting, then this
// function locally reconstructs an AdaptationSessionDiff[] by comparing that
// snapshot against the post-revision PlanDetail. This is a presentational
// reconstruction only — it is never sent back to the API, and it does not
// attempt to infer semantic change-type as precisely as the LLM-authored
// diff_json does (see the `change` heuristic below).
//
// Items are matched by position (item_order) rather than id: `revise_plan`
// deletes and fully re-inserts a changed session's items, so old and new
// item ids never correspond to "the same" exercise slot the way the AI
// adaptation path's PlannedItemPatch.item_id does.

function itemsEqual(a: PlannedItemOut, b: PlannedItemOut): boolean {
  return (
    a.movement_name === b.movement_name &&
    a.sets === b.sets &&
    a.reps === b.reps &&
    a.load_pct_1rm === b.load_pct_1rm &&
    a.load_kg === b.load_kg &&
    a.notes === b.notes
  );
}

function toItemChange(
  oldItem: PlannedItemOut | undefined,
  newItem: PlannedItemOut | undefined,
  order: number,
): AdaptationItemChange | null {
  if (!oldItem && !newItem) return null;
  if (oldItem && !newItem) {
    return {
      item_id: oldItem.id,
      movement_name: oldItem.movement_name,
      item_order: order,
      old_sets: oldItem.sets,
      old_reps: oldItem.reps,
      old_load_pct_1rm: oldItem.load_pct_1rm,
      old_load_kg: oldItem.load_kg,
      old_notes: oldItem.notes,
      new_sets: null,
      new_reps: null,
      new_load_pct_1rm: null,
      new_load_kg: null,
      new_notes: null,
      changed: true,
      removed: true,
    };
  }
  if (!oldItem && newItem) {
    return {
      item_id: null,
      movement_name: newItem.movement_name,
      item_order: order,
      old_sets: null,
      old_reps: null,
      old_load_pct_1rm: null,
      old_load_kg: null,
      old_notes: null,
      new_sets: newItem.sets,
      new_reps: newItem.reps,
      new_load_pct_1rm: newItem.load_pct_1rm,
      new_load_kg: newItem.load_kg,
      new_notes: newItem.notes,
      changed: true,
      removed: false,
    };
  }
  // Both present.
  const o = oldItem as PlannedItemOut;
  const n = newItem as PlannedItemOut;
  const changed = !itemsEqual(o, n);
  return {
    item_id: n.id,
    movement_name: n.movement_name,
    item_order: order,
    old_sets: o.sets,
    old_reps: o.reps,
    old_load_pct_1rm: o.load_pct_1rm,
    old_load_kg: o.load_kg,
    old_notes: o.notes,
    new_sets: n.sets,
    new_reps: n.reps,
    new_load_pct_1rm: n.load_pct_1rm,
    new_load_kg: n.load_kg,
    new_notes: n.notes,
    changed,
    removed: false,
  };
}

/**
 * Infers a `change` bucket from item-level diffs alone (session-level status
 * transitions like `skip` are decided by the caller, which has both
 * sessions' `status` and isn't limited to this generic taxonomy). Compares
 * "did ANY changed item touch load" vs "did ANY changed item touch
 * sets/reps" independently — rather than requiring every changed item to
 * match one rigid single-field pattern — so a reps-only change (e.g.
 * "5 × 5" -> "5 × 3", `old_sets === new_sets`) is still correctly labeled
 * `reduce_volume` instead of falling through to the generic `swap_session`
 * bucket.
 */
function inferManualChangeType(
  itemChanges: AdaptationItemChange[],
): AdaptationSessionDiff["change"] {
  const changedOnes = itemChanges.filter((ic) => ic.changed);
  if (changedOnes.length === 0) return "swap_session";
  const anyStructural = changedOnes.some(
    (ic) => ic.removed || ic.old_sets === null || ic.new_sets === null,
  );
  if (anyStructural) return "swap_session";
  const anyLoadChanged = changedOnes.some(
    (ic) =>
      ic.old_load_pct_1rm !== ic.new_load_pct_1rm ||
      ic.old_load_kg !== ic.new_load_kg,
  );
  const anySetsRepsChanged = changedOnes.some(
    (ic) => ic.old_sets !== ic.new_sets || ic.old_reps !== ic.new_reps,
  );
  if (anyLoadChanged && !anySetsRepsChanged) return "reduce_intensity";
  if (anySetsRepsChanged && !anyLoadChanged) return "reduce_volume";
  return "swap_session";
}

/**
 * Reconstruct a presentational diff between a pre-revision session snapshot
 * and the post-revision PlanDetail sessions. Sessions with no detectable
 * difference are omitted (mirrors the AI path never listing untouched
 * sessions in diff_json).
 *
 * Walks the UNION of old and new session ids (not just old ones) so a
 * session the revision newly inserted is surfaced too, not silently
 * dropped — symmetric with how a removed session is already handled
 * (present in old, absent from new -> skipped over, nothing to diff
 * against). Session-level changes considered "something changed" beyond
 * item diffs: title, notes, scheduled_date (a pure reschedule), and status
 * (covers `skip` in either direction — including a previously-skipped
 * session being restored, not just newly-skipped).
 */
export function computeManualRevisionDiff(
  oldSessions: PlannedSessionOut[],
  newSessions: PlannedSessionOut[],
): AdaptationSessionDiff[] {
  const oldById = new Map(oldSessions.map((s) => [s.id, s]));
  const newById = new Map(newSessions.map((s) => [s.id, s]));
  const allIds = new Set([...oldById.keys(), ...newById.keys()]);
  const diffs: AdaptationSessionDiff[] = [];

  for (const id of allIds) {
    const oldSession = oldById.get(id);
    const newSession = newById.get(id);
    // A session removed entirely (present in old, gone from new) isn't a
    // shape `revise_plan` produces today (it patches sessions, never
    // deletes rows) — nothing to diff against, so skip rather than guess.
    if (!newSession) continue;

    if (!oldSession) {
      // Brand-new session the revision inserted — every item is a pure
      // "add" row (all old_* fields null), same rendering as `add_rest`.
      const itemChanges = newSession.items
        .map((it, i) => toItemChange(undefined, it, i))
        .filter((ic): ic is AdaptationItemChange => ic !== null);
      diffs.push({
        session_id: newSession.id,
        session_title: newSession.title,
        scheduled_date: newSession.scheduled_date,
        change: "swap_session",
        load_pct_delta: null,
        volume_delta_sets: null,
        notes: "",
        item_changes: itemChanges,
      });
      continue;
    }

    const statusChanged = oldSession.status !== newSession.status;
    const becameSkipped = statusChanged && newSession.status === "skipped";

    const maxLen = Math.max(oldSession.items.length, newSession.items.length);
    const itemChanges: AdaptationItemChange[] = [];
    for (let i = 0; i < maxLen; i++) {
      const ic = toItemChange(oldSession.items[i], newSession.items[i], i);
      if (ic) itemChanges.push(ic);
    }

    const anythingChanged =
      statusChanged ||
      itemChanges.some((ic) => ic.changed) ||
      oldSession.title !== newSession.title ||
      oldSession.notes !== newSession.notes ||
      oldSession.scheduled_date !== newSession.scheduled_date;
    if (!anythingChanged) continue;

    const volumeDeltaSets = itemChanges.reduce((sum, ic) => {
      if (ic.old_sets == null || ic.new_sets == null) return sum;
      return sum + (ic.new_sets - ic.old_sets);
    }, 0);
    const loadDeltas = itemChanges
      .filter(
        (ic) => ic.old_load_pct_1rm != null && ic.new_load_pct_1rm != null,
      )
      .map(
        (ic) =>
          (ic.new_load_pct_1rm as number) - (ic.old_load_pct_1rm as number),
      );
    const load_pct_delta =
      loadDeltas.length > 0
        ? Math.round(
            (loadDeltas.reduce((a, b) => a + b, 0) / loadDeltas.length) * 10,
          ) / 10
        : null;

    diffs.push({
      session_id: newSession.id,
      session_title: newSession.title,
      scheduled_date: newSession.scheduled_date,
      change: becameSkipped ? "skip" : inferManualChangeType(itemChanges),
      load_pct_delta,
      volume_delta_sets: volumeDeltaSets || null,
      notes: "",
      item_changes: itemChanges,
    });
  }

  return diffs;
}

// ── Stale-diff re-validation (design spec §8.7) ─────────────────────────────
//
// A manual revision (§9) can rewrite `prescribed` sessions after a `proposed`
// AI adaptation's diff_json was minted, leaving the cached diff's "old" side
// referring to session state that no longer exists. Before allowing Merge,
// re-validate every changed/context/removed item's recorded old_* values
// against the athlete's current live session state; any mismatch means the
// diff is stale and must not be merged as-is.

export function isAdaptationDiffStale(
  diffs: AdaptationSessionDiff[],
  liveSessions: PlannedSessionOut[],
): boolean {
  const liveById = new Map(liveSessions.map((s) => [s.id, s]));

  for (const diff of diffs) {
    if (diff.change === "skip") continue; // nothing "old" to compare structurally
    const liveSession = liveById.get(diff.session_id);
    if (!liveSession) return true; // session gone/renamed entirely — stale

    const liveItemsById = new Map(liveSession.items.map((it) => [it.id, it]));
    for (const ic of diff.item_changes ?? []) {
      if (!ic.item_id) continue; // pure "add" row — no prior live item to check
      const live = liveItemsById.get(ic.item_id);
      if (!live) return true; // item referenced by the diff no longer exists
      if (
        live.sets !== ic.old_sets ||
        live.reps !== ic.old_reps ||
        live.load_pct_1rm !== ic.old_load_pct_1rm ||
        live.load_kg !== ic.old_load_kg
      ) {
        return true;
      }
    }
  }
  return false;
}

/** Plain-language trigger explanation for the announcement banner (§8.2). */
export function triggerReasonCopy(
  triggerType: string,
  data: Record<string, unknown>,
): string {
  switch (triggerType) {
    case "high_acwr": {
      const acwr =
        typeof data.acwr === "number" ? data.acwr.toFixed(2) : "elevated";
      return `Your acute:chronic workload ratio hit ${acwr} — above the 1.5 overtraining threshold.`;
    }
    case "low_readiness": {
      const days =
        typeof data.streak_days === "number" ? data.streak_days : "several";
      return `Your recovery score has been low for ${days} consecutive days.`;
    }
    case "missed_session": {
      const count = typeof data.count === "number" ? data.count : "multiple";
      const window =
        typeof data.window_days === "number" ? data.window_days : 7;
      return `You've missed ${count} sessions in the last ${window} days.`;
    }
    case "rpe_creep": {
      const rpe =
        typeof data.avg_rpe === "number" ? data.avg_rpe.toFixed(1) : "elevated";
      return `Your 7-day average session RPE hit ${rpe}.`;
    }
    default:
      return "FitHub noticed a training-load trend worth reviewing.";
  }
}

/**
 * Selective invalidation after an adjust round-trip (§8.4): only sessions
 * whose proposed change actually differs between the prior and revised
 * diff should lose their "Viewed" state; unchanged ones stay checked.
 */
function itemChangesEqual(
  a: AdaptationItemChange[],
  b: AdaptationItemChange[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((ic, i) => {
    const other = b[i];
    return (
      !!other &&
      ic.item_id === other.item_id &&
      ic.movement_name === other.movement_name &&
      ic.item_order === other.item_order &&
      ic.old_sets === other.old_sets &&
      ic.old_reps === other.old_reps &&
      ic.old_load_pct_1rm === other.old_load_pct_1rm &&
      ic.old_load_kg === other.old_load_kg &&
      ic.old_notes === other.old_notes &&
      ic.new_sets === other.new_sets &&
      ic.new_reps === other.new_reps &&
      ic.new_load_pct_1rm === other.new_load_pct_1rm &&
      ic.new_load_kg === other.new_load_kg &&
      ic.new_notes === other.new_notes &&
      ic.changed === other.changed &&
      ic.removed === other.removed
    );
  });
}

/** Field-by-field equality — not `JSON.stringify`, which is key-order-sensitive
 * and would false-positive "changed" on a benign backend field reordering. */
function sessionDiffsEqual(
  a: AdaptationSessionDiff,
  b: AdaptationSessionDiff,
): boolean {
  return (
    a.session_id === b.session_id &&
    a.session_title === b.session_title &&
    a.scheduled_date === b.scheduled_date &&
    a.change === b.change &&
    a.load_pct_delta === b.load_pct_delta &&
    a.volume_delta_sets === b.volume_delta_sets &&
    a.notes === b.notes &&
    itemChangesEqual(a.item_changes ?? [], b.item_changes ?? [])
  );
}

export function sessionsChangedBetweenDiffs(
  prior: AdaptationSessionDiff[],
  revised: AdaptationSessionDiff[],
): Set<string> {
  const priorById = new Map(prior.map((d) => [d.session_id, d]));
  const changed = new Set<string>();
  for (const d of revised) {
    const before = priorById.get(d.session_id);
    if (!before || !sessionDiffsEqual(before, d)) {
      changed.add(d.session_id);
    }
  }
  return changed;
}
