"use client";

import { useEffect, useState } from "react";
import type { ApiClient } from "@/lib/api/client";
import type { PersonalRecord, WeightUnit } from "@/lib/api";
import { formatWeightDelta } from "@/lib/display";

export interface PrGroupInput {
  movementId: string;
  movementName: string;
}

interface PrLine {
  key: string;
  text: string;
}

const SESSION_KEY_PREFIX = "fithub_pr_banner_shown_";

/**
 * PR celebration banner (07 §H, PR half only — the streak-milestone half is a
 * separate toast owned by `lib/gamification/milestone-toast.ts`). A subtle
 * in-flow banner, not a Sonner toast — the Bible chose Hevy's in-workout
 * banner + medal over SugarWOD's full-screen confetti interrupt.
 *
 * PR *detection* belongs to the logging domain and already exists (the
 * `analytics.personalRecords()` response already carries `prev_best_1rm_kg` /
 * `delta_kg` computed server-side); this component only styles the moment.
 * Only weight-type PRs get an exact delta line — the endpoint's delta is
 * always an e1RM-kg figure, so a reps-only/bodyweight PR that never produced
 * a `PersonalRecord` row (no load to compute an e1RM from) is intentionally
 * left out rather than fabricating a delta number the data doesn't support.
 */
export function PRCelebrationBanner({
  workoutId,
  prGroups,
  client,
  weightUnit,
}: {
  workoutId: string;
  prGroups: PrGroupInput[];
  client: ApiClient;
  weightUnit: WeightUnit;
}) {
  const [records, setRecords] = useState<PersonalRecord[] | null>(null);

  // `prGroups` starts empty on first render (the parent's strict-PR match
  // depends on its own async `personalRecordsBatch` fetch resolving first)
  // and only becomes non-empty on a later re-render — so this effect must
  // key off the actual movement-id set, not just `workoutId`, or it fires
  // once while `prGroups` is still empty and never re-fires once it isn't.
  const movementIdsKey = prGroups.map((g) => g.movementId).join(",");

  useEffect(() => {
    if (prGroups.length === 0) return;
    const controller = new AbortController();
    let cancelled = false;

    client.analytics
      .personalRecords({ signal: controller.signal })
      .then((res) => {
        if (!cancelled) setRecords(res);
      })
      .catch(() => {
        if (cancelled || controller.signal.aborted) return;
        setRecords([]); // fail quiet — the banner is a celebration, not critical
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, workoutId, movementIdsKey]);

  if (prGroups.length === 0 || records === null) return null;

  const lines: PrLine[] = [];
  for (const group of prGroups) {
    const record = records.find((r) => r.movement_id === group.movementId);
    if (!record || record.workout_id !== workoutId) continue;
    if (record.load_kg == null || record.delta_kg == null) {
      // No weight-bearing PR data to form an honest delta from — skip rather
      // than invent one (e.g. a bodyweight/reps-only movement).
      if (record.prev_best_1rm_kg == null) {
        lines.push({
          key: group.movementId,
          text: `First PR — ${group.movementName}, your benchmark is set`,
        });
      }
      continue;
    }
    const isFirstEver = record.prev_best_1rm_kg == null;
    const text = isFirstEver
      ? `First PR — ${group.movementName}, your benchmark is set`
      : `New PR — ${group.movementName} +${formatWeightDelta(
          record.delta_kg,
          weightUnit,
        )} from your previous best`;
    lines.push({ key: group.movementId, text });
  }

  if (typeof window !== "undefined") {
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i]!;
      const sessionKey = `${SESSION_KEY_PREFIX}${line.key}`;
      if (window.sessionStorage.getItem(sessionKey) === line.text) {
        lines.splice(i, 1); // dedupe: same movement + same PR value already shown
      } else {
        window.sessionStorage.setItem(sessionKey, line.text);
      }
    }
  }

  if (lines.length === 0) return null;

  return (
    <div
      role="status"
      className="mb-4 flex flex-col gap-1.5 rounded-[10px] border border-[var(--purple)] bg-[var(--purple)]/10 px-4 py-3"
    >
      {lines.map((line) => (
        <p
          key={line.key}
          className="font-sans text-[13px] font-medium text-[var(--purple)]"
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}
